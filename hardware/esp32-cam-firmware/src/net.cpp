#include "net.h"

#include <ArduinoJson.h>
#include <time.h>

#include "camera_control.h"
#include "secrets.h"

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

const char* DEVICE_ID = IOT_HUB_DEVICE_ID;

// Twin topics (Azure IoT Hub MQTT conventions)
static const char* TWIN_TOPIC_GET = "$iothub/twin/GET/?$rid=1";
static const char* TWIN_TOPIC_RES_SUB = "$iothub/twin/res/#";
static const char* TWIN_TOPIC_PATCH_SUB = "$iothub/twin/PATCH/properties/desired/#";

// How often to re-request the full twin as a safety net against a missed
// desired-property PATCH. Must be well under the backend command validity
// (COMMAND_VALIDITY_MS = 60s) so a capture command is still picked up.
static const unsigned long TWIN_RESYNC_INTERVAL_MS = 20000;

// ---------------------------------------------------------------------------
// Wi-Fi
// ---------------------------------------------------------------------------

void connectWifi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
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
// Time (NTP) — required for wall-clock command expiry checks.
// ---------------------------------------------------------------------------

void initTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  setenv("TZ", TZ_RULE, 1);
  tzset();

  Serial.print("Waiting for NTP sync");
  unsigned long startMs = millis();
  while (time(nullptr) < 1700000000) {
    if (millis() - startMs > 15000) {
      Serial.println(" timed out (commands with expiresAtMs will be ignored until clock is sane)");
      return;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  time_t now = time(nullptr);
  Serial.print("Local time: ");
  Serial.print(ctime(&now));
}

uint64_t nowEpochMs() {
  time_t now = time(nullptr);
  // Treat anything before 2023-11-01 as "not synced" — catches the default
  // epoch (0) and any plausible factory-reset clock value.
  if (now < 1700000000) return 0;
  return (uint64_t)now * 1000ULL;
}

// ---------------------------------------------------------------------------
// MQTT
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
    if (!desired.isNull()) applyCameraTwin(desired);
    return;
  }

  // Twin desired-properties patch
  if (strncmp(topic, "$iothub/twin/PATCH/properties/desired/", 38) == 0) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
      Serial.printf("Twin PATCH parse error: %s\n", err.c_str());
      return;
    }
    applyCameraTwin(doc.as<JsonObjectConst>());
    return;
  }
}

void connectMqtt() {
  mqttClient.setServer(IOT_HUB_HOST, 8883);

  while (!mqttClient.connected()) {
    Serial.print("Connecting to IoT Hub MQTT...");

    if (mqttClient.connect(DEVICE_ID, IOT_HUB_MQTT_USERNAME, IOT_HUB_MQTT_PASSWORD)) {
      Serial.println(" connected");
      mqttClient.subscribe(TWIN_TOPIC_RES_SUB);
      mqttClient.subscribe(TWIN_TOPIC_PATCH_SUB);
      mqttClient.publish(TWIN_TOPIC_GET, "");
    } else {
      int state = mqttClient.state();
      Serial.printf(" failed, rc=%d, retrying in 5s...\n", state);
      delay(5000);
    }
  }
}

void ensureMqttConnected() {
  if (mqttClient.connected()) return;
  Serial.println("MQTT disconnected, reconnecting...");
  connectMqtt();
}

// Periodically re-request the full twin. The desired-property PATCH push is the
// primary delivery path, but if a patch is ever missed (brief disconnect, a
// blocking upload that stalled the loop past a keepalive), this pulls the
// current `command` so the capture still happens within its validity window.
// queueCommandFromTwin() dedupes via lastExecutedRequestId, so re-applying an
// already-executed command is a no-op.
void maybeResyncTwin() {
  if (!mqttClient.connected()) return;

  static unsigned long lastResyncMs = 0;
  unsigned long nowMs = millis();
  if (lastResyncMs == 0) { lastResyncMs = nowMs; return; }  // skip the first tick; connect already GET'd
  if ((nowMs - lastResyncMs) < TWIN_RESYNC_INTERVAL_MS) return;
  lastResyncMs = nowMs;

  mqttClient.publish(TWIN_TOPIC_GET, "");
}
