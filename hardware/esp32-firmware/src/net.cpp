#include "net.h"

#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include <time.h>
#include "config.h"
#include "control.h"
#include "secrets.h"
#include "sensors.h"

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);
bool ntpSynced = false;

const char* DEVICE_ID = IOT_HUB_DEVICE_ID;

// IoT Hub D2C topic: messageType property lets the backend route the message.
const char* TELEMETRY_TOPIC = "devices/esp32-main-1/messages/events/$.ct=application%2Fjson&$.ce=utf-8&messageType=telemetry";
const char* STATUS_TOPIC = "devices/esp32-main-1/messages/events/$.ct=application%2Fjson&$.ce=utf-8&messageType=status";

// Twin topics (Azure IoT Hub MQTT conventions)
static const char* TWIN_TOPIC_GET = "$iothub/twin/GET/?$rid=1";
static const char* TWIN_TOPIC_RES_SUB = "$iothub/twin/res/#";
static const char* TWIN_TOPIC_PATCH_SUB = "$iothub/twin/PATCH/properties/desired/#";

// Loop-driven reconnect cadence. Non-blocking: at most one attempt per interval
// so the safety control loop keeps running while the broker is unreachable.
static const unsigned long MQTT_RECONNECT_INTERVAL_MS = 3000;
// Re-request the full twin periodically so a missed desired-property PATCH
// (manual pump/fan/light test pushed while briefly disconnected) is still
// picked up promptly rather than waiting for the next 5-min telemetry cycle.
static const unsigned long TWIN_RESYNC_INTERVAL_MS = 20000;

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

const char* mqttStateName(int state) {
  switch (state) {
    case MQTT_CONNECTION_TIMEOUT: return "connection timeout";
    case MQTT_CONNECTION_LOST: return "connection lost";
    case MQTT_CONNECT_FAILED: return "TCP connect failed";
    case MQTT_DISCONNECTED: return "disconnected";
    case MQTT_CONNECTED: return "connected";
    case MQTT_CONNECT_BAD_PROTOCOL: return "bad protocol";
    case MQTT_CONNECT_BAD_CLIENT_ID: return "bad client ID";
    case MQTT_CONNECT_UNAVAILABLE: return "server unavailable";
    case MQTT_CONNECT_BAD_CREDENTIALS: return "bad username/password";
    case MQTT_CONNECT_UNAUTHORIZED: return "unauthorized";
    default: return "unknown";
  }
}

void printTlsLastError() {
  char errorBuf[128];
  int errorCode = wifiClient.lastError(errorBuf, sizeof(errorBuf));
  if (errorCode == 0) {
    Serial.println("TLS last error: none");
    return;
  }

  Serial.print("TLS last error: ");
  Serial.print(errorCode);
  Serial.print(" ");
  Serial.println(errorBuf);
}

void printConnectionDiagnostics() {
  Serial.print("Wi-Fi status: ");
  Serial.print(WiFi.status());
  Serial.print(", RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.print(" dBm, IP: ");
  Serial.println(WiFi.localIP());

  IPAddress hubIp;
  if (WiFi.hostByName(IOT_HUB_HOST, hubIp)) {
    Serial.print("DNS resolved ");
    Serial.print(IOT_HUB_HOST);
    Serial.print(" -> ");
    Serial.println(hubIp);
  } else {
    Serial.print("DNS failed for ");
    Serial.println(IOT_HUB_HOST);
  }

  Serial.print("Testing TLS socket to ");
  Serial.print(IOT_HUB_HOST);
  Serial.print(":8883...");
  if (wifiClient.connect(IOT_HUB_HOST, 8883)) {
    Serial.println(" ok");
    wifiClient.stop();
  } else {
    Serial.println(" failed");
    printTlsLastError();
  }
}

// ---------------------------------------------------------------------------
// Wi-Fi
// ---------------------------------------------------------------------------

void connectWifi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  // Recover from Wi-Fi drops in the background so the loop never has to block in
  // connectWifi() (which would stall the safety control loop) just to get MQTT
  // back. The 5-min telemetry path still calls ensureWifiConnected() as a backstop.
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - startMs > 20000) {
      Serial.println();
      Serial.println("Wi-Fi connect timeout");
      return;
    }
  }

  Serial.println();
  Serial.print("Wi-Fi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("Wi-Fi disconnected, reconnecting...");
  WiFi.disconnect();
  connectWifi();
}

// ---------------------------------------------------------------------------
// Time (NTP)
// ---------------------------------------------------------------------------

void initTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  setenv("TZ", TZ_RULE, 1);
  tzset();

  Serial.print("Waiting for NTP sync");
  unsigned long startMs = millis();
  while (time(nullptr) < 1700000000) {
    if (millis() - startMs > 15000) {
      Serial.println(" timed out (control loop will run with default settings only)");
      return;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  ntpSynced = true;
  time_t now = time(nullptr);
  Serial.print("Local time: ");
  Serial.print(ctime(&now));
}

uint64_t nowEpochMs() {
  if (!ntpSynced) return 0;
  time_t now = time(nullptr);
  if (now < 1700000000) return 0;  // ~2023-11; sentinel for un-synced clock
  return (uint64_t)now * 1000ULL;
}

void publishOverrideReport(const char* label, const DeviceOverride& slot) {
  if (!mqttClient.connected()) return;
  static int reportedRid = 100;
  char topic[80];
  snprintf(topic, sizeof(topic),
    "$iothub/twin/PATCH/properties/reported/?$rid=%d", ++reportedRid);
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"overridesInterpreted\":{\"%s\":{\"active\":%s,\"desiredState\":%s,\"expiresAtMs\":%llu,\"lastAppliedAtMs\":%llu}}}",
    label,
    slot.active ? "true" : "false",
    slot.desiredState ? "true" : "false",
    (unsigned long long)slot.expiresAtMs,
    (unsigned long long)nowEpochMs());
  mqttClient.publish(topic, payload);
}

// ---------------------------------------------------------------------------
// Twin handling — dispatched from MQTT callback into control layer
// ---------------------------------------------------------------------------

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Twin GET response (full doc: { desired: {...}, reported: {...} })
  if (strncmp(topic, "$iothub/twin/res/", 17) == 0) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
      Serial.printf("Twin GET response parse error: %s\n", err.c_str());
      return;
    }
    JsonObjectConst desired = doc["desired"];
    if (!desired.isNull()) applySettings(desired);
    return;
  }

  // Twin desired-properties patch (body is the patch object directly)
  if (strncmp(topic, "$iothub/twin/PATCH/properties/desired/", 38) == 0) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
      Serial.printf("Twin PATCH parse error: %s\n", err.c_str());
      return;
    }
    applySettings(doc.as<JsonObjectConst>());
    return;
  }
}

// ---------------------------------------------------------------------------
// MQTT
// ---------------------------------------------------------------------------

// Single connection attempt. On success: subscribe to twin responses + future
// PATCHes, request the full twin (so we apply the latest settings/overrides on
// every connect), and publish an online status. Returns the connection result.
static bool mqttConnectAttempt() {
  esp_task_wdt_reset();
  Serial.print("Connecting to IoT Hub MQTT...");

  if (mqttClient.connect(DEVICE_ID, IOT_HUB_MQTT_USERNAME, IOT_HUB_MQTT_PASSWORD)) {
    Serial.println(" connected");

    mqttClient.subscribe(TWIN_TOPIC_RES_SUB);
    mqttClient.subscribe(TWIN_TOPIC_PATCH_SUB);
    mqttClient.publish(TWIN_TOPIC_GET, "");

    String status = "{\"status\":\"online\",\"uptime_ms\":";
    status += String(millis());
    status += ",\"free_heap\":";
    status += String(ESP.getFreeHeap());
    status += ",\"bme280_healthy\":";
    status += bme280Healthy ? "true" : "false";
    status += ",\"bh1750_healthy\":";
    status += bh1750Healthy ? "true" : "false";
    status += ",\"ads1115_ok\":";
    status += adsOk ? "true" : "false";
    status += "}";
    mqttClient.publish(STATUS_TOPIC, status.c_str());
    return true;
  }

  int state = mqttClient.state();
  Serial.print(" failed, rc=");
  Serial.print(state);
  Serial.print(" (");
  Serial.print(mqttStateName(state));
  Serial.print(")");
  Serial.println();
  printTlsLastError();
  printConnectionDiagnostics();
  return false;
}

// Blocking connect used once at boot — wait for the first connection before the
// watchdog is armed so a slow first DHCP/NTP/TLS bring-up isn't punished.
void connectMqtt() {
  mqttClient.setServer(IOT_HUB_HOST, 8883);

  while (!mqttClient.connected()) {
    esp_task_wdt_reset();
    if (mqttConnectAttempt()) break;
    Serial.println("Retrying in 5s...");
    delay(5000);
  }
}

// Non-blocking reconnect for the main loop. Tries at most once per
// MQTT_RECONNECT_INTERVAL_MS and returns immediately either way, so the safety
// control loop (evalPump/evalFan/evalLights + wall-clock override expiry) keeps
// running even while the broker is unreachable.
//
// Previously the loop never called this — MQTT was only reconnected inside
// publishTelemetry(), i.e. once every READ_INTERVAL_MS (5 min). A session that
// dropped after the first command left the device deaf to twin commands
// (manual pump/fan/light tests) until the next telemetry cycle or a reboot,
// which is why a test "worked only the first time" after a reboot.
void ensureMqttConnected() {
  if (mqttClient.connected()) return;

  static unsigned long lastAttemptMs = 0;
  unsigned long nowMs = millis();
  if (lastAttemptMs != 0 && (nowMs - lastAttemptMs) < MQTT_RECONNECT_INTERVAL_MS) return;
  lastAttemptMs = nowMs;

  Serial.println("MQTT disconnected — attempting reconnect...");
  mqttConnectAttempt();
}

// Periodically re-request the full twin as a safety net against a missed
// desired-property PATCH. applySettings() is idempotent (missing fields keep
// current values; overrides re-evaluate their own wall-clock expiry), so
// re-applying the current desired state is harmless.
void maybeResyncTwin() {
  if (!mqttClient.connected()) return;

  static unsigned long lastResyncMs = 0;
  unsigned long nowMs = millis();
  if (lastResyncMs == 0) { lastResyncMs = nowMs; return; }  // skip first tick; connect already GET'd
  if ((nowMs - lastResyncMs) < TWIN_RESYNC_INTERVAL_MS) return;
  lastResyncMs = nowMs;

  mqttClient.publish(TWIN_TOPIC_GET, "");
}
