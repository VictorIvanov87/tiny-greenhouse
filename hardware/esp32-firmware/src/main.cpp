#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <math.h>
#include <time.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <Adafruit_ADS1X15.h>
#include "secrets.h"

Adafruit_BME280 bme;
Adafruit_ADS1115 ads;

static const uint8_t BH1750_ADDR = 0x23;
static const unsigned long READ_INTERVAL_MS = 300000; // 5 minutes

static const uint8_t FAN_PIN = 23;   // GPIO23 -> PWM1 on MOSFET module
static const uint8_t PUMP_PIN = 19;  // GPIO19 -> PWM2 on MOSFET module
static const uint8_t LIGHT_PIN = 18; // GPIO18 -> PWM3 on MOSFET module

// Bulgaria timezone (EET/EEST). Lights schedule + pump daily reset use local time.
static const char* TZ_RULE = "EET-2EEST,M3.5.0/3,M10.5.0/4";

// Twin topics (Azure IoT Hub MQTT conventions)
static const char* TWIN_TOPIC_GET = "$iothub/twin/GET/?$rid=1";
static const char* TWIN_TOPIC_RES_SUB = "$iothub/twin/res/#";
static const char* TWIN_TOPIC_PATCH_SUB = "$iothub/twin/PATCH/properties/desired/#";

// Soil moisture calibration on-device (must match backend defaults). Future:
// ship via twin so users can recalibrate without reflash.
static const float SOIL_RAW_DRY = 22000.0f;
static const float SOIL_RAW_WET = 9500.0f;

static const uint8_t SOIL_SENSOR_COUNT = 4;
static const uint8_t SOIL_ADS_CHANNELS[SOIL_SENSOR_COUNT] = {0, 1, 2, 3};

static const char* DEVICE_ID = IOT_HUB_DEVICE_ID;

// IoT Hub D2C topic: messageType property lets the backend route the message.
static const char* TELEMETRY_TOPIC = "devices/esp32-main-1/messages/events/$.ct=application%2Fjson&$.ce=utf-8&messageType=telemetry";
static const char* STATUS_TOPIC = "devices/esp32-main-1/messages/events/$.ct=application%2Fjson&$.ce=utf-8&messageType=status";

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastReadMs = 0;
bool adsOk = false;

// Actuator state — reported in telemetry, driven by the control loop below.
bool pumpOn = false;
bool lightsOn = false;
bool fanOn = false;

// ---------------------------------------------------------------------------
// Control settings — mirror of IoT Hub device twin desired properties.
// Defaults match backend HARDCODED_DEFAULTS (services/controlSettings.ts) so
// the device behaves sanely between boot and the first twin sync.
// ---------------------------------------------------------------------------

struct ControlSettings {
  uint32_t version = 0;
  struct {
    float tempMaxC = 26.0f;
    float humidityMaxPct = 70.0f;
    float soilMoisturePctMin = 40.0f;
    float soilMoisturePctMax = 60.0f;
  } thresholds;
  struct {
    uint8_t startHour = 9;
    uint8_t endHour = 21;
  } lights;
  struct {
    uint32_t periodicEverySec = 3600;
    uint32_t periodicDurationSec = 300;
    float humidityOverridePct = 70.0f;
  } fan;
  struct {
    float triggerPct = 43.0f;
    uint32_t delayAfterMeasurementSec = 25;
    uint32_t pulseDurationSec = 5;
    uint32_t settleWindowSec = 1800;
    uint16_t maxPulsesPerDay = 6;
  } pump;
};

ControlSettings settings;

// Control state — uptime-based seconds, lost on reboot (acceptable: trigger
// logic + cooldown prevent runaway pumping even with a reset counter).
uint32_t lastPeriodicFanStart = 0;
uint32_t periodicFanUntil = 0;
uint32_t lastPumpAt = 0;
uint32_t pumpScheduledAt = 0;
uint32_t pumpRunningUntil = 0;
uint16_t pumpsTodayCount = 0;
int pumpsTodayYday = -1;

// Latest sensor readings — updated on each measurement cycle, consumed by the
// per-iteration control evaluators.
float lastHumidity = 0.0f;
float lastSoilPct = 100.0f; // start "wet" so we don't pump before the first reading
bool ntpSynced = false;

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
// Sensors
// ---------------------------------------------------------------------------

bool initBme280() {
  return bme.begin(0x76);
}

bool initBh1750() {
  Wire.beginTransmission(BH1750_ADDR);
  Wire.write(0x10); // continuous high-res mode
  return Wire.endTransmission() == 0;
}

bool initAds1115() {
  if (!ads.begin(0x48)) {
    return false;
  }

  ads.setGain(GAIN_ONE); // +/- 4.096 V range, good for 3.3 V analog sensors.
  return true;
}

float readLightLux() {
  delay(180);

  Wire.requestFrom(BH1750_ADDR, (uint8_t)2);
  if (Wire.available() == 2) {
    uint16_t raw = ((uint16_t)Wire.read() << 8) | Wire.read();
    return raw / 1.2f;
  }

  return -1.0f;
}

int16_t readSoilChannelRaw(uint8_t channel) {
  return ads.readADC_SingleEnded(channel);
}

int readSoilMoistureRaw(int16_t outChannels[SOIL_SENSOR_COUNT]) {
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) outChannels[i] = -1;
  if (!adsOk) return -1;

  long total = 0;
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
    outChannels[i] = readSoilChannelRaw(SOIL_ADS_CHANNELS[i]);
    total += outChannels[i];
    delay(5);
  }
  return total / SOIL_SENSOR_COUNT;
}

void printSoilChannels(const int16_t channels[SOIL_SENSOR_COUNT]) {
  if (!adsOk) {
    Serial.println("Soil sensors: ADS1115 not available");
    return;
  }

  Serial.print("Soil raw channels:");
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
    Serial.print(" A");
    Serial.print(SOIL_ADS_CHANNELS[i]);
    Serial.print("=");
    Serial.print(channels[i]);
  }
  Serial.println();
}

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
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

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

// ---------------------------------------------------------------------------
// Soil percent (mirrors backend rawToSoilPercent)
// ---------------------------------------------------------------------------

float rawToSoilPercent(int raw) {
  if (raw <= 0) return 0.0f;
  float pct = ((SOIL_RAW_DRY - (float)raw) / (SOIL_RAW_DRY - SOIL_RAW_WET)) * 100.0f;
  if (pct < 0.0f) return 0.0f;
  if (pct > 100.0f) return 100.0f;
  return pct;
}

// ---------------------------------------------------------------------------
// Twin handling
// ---------------------------------------------------------------------------

void applySettings(JsonObjectConst obj) {
  // Apply incoming fields; missing fields keep current values. No version
  // gate — IoT Hub guarantees ordered delivery of twin patches.
  if (!obj["version"].isNull()) settings.version = obj["version"].as<uint32_t>();

  JsonObjectConst t = obj["thresholds"];
  if (!t.isNull()) {
    settings.thresholds.tempMaxC = t["tempMaxC"] | settings.thresholds.tempMaxC;
    settings.thresholds.humidityMaxPct = t["humidityMaxPct"] | settings.thresholds.humidityMaxPct;
    settings.thresholds.soilMoisturePctMin = t["soilMoisturePctMin"] | settings.thresholds.soilMoisturePctMin;
    settings.thresholds.soilMoisturePctMax = t["soilMoisturePctMax"] | settings.thresholds.soilMoisturePctMax;
  }
  JsonObjectConst l = obj["lights"];
  if (!l.isNull()) {
    settings.lights.startHour = l["startHour"] | settings.lights.startHour;
    settings.lights.endHour = l["endHour"] | settings.lights.endHour;
  }
  JsonObjectConst f = obj["fan"];
  if (!f.isNull()) {
    settings.fan.periodicEverySec = f["periodicEverySec"] | settings.fan.periodicEverySec;
    settings.fan.periodicDurationSec = f["periodicDurationSec"] | settings.fan.periodicDurationSec;
    settings.fan.humidityOverridePct = f["humidityOverridePct"] | settings.fan.humidityOverridePct;
  }
  JsonObjectConst p = obj["pump"];
  if (!p.isNull()) {
    settings.pump.triggerPct = p["triggerPct"] | settings.pump.triggerPct;
    settings.pump.delayAfterMeasurementSec = p["delayAfterMeasurementSec"] | settings.pump.delayAfterMeasurementSec;
    settings.pump.pulseDurationSec = p["pulseDurationSec"] | settings.pump.pulseDurationSec;
    settings.pump.settleWindowSec = p["settleWindowSec"] | settings.pump.settleWindowSec;
    settings.pump.maxPulsesPerDay = p["maxPulsesPerDay"] | settings.pump.maxPulsesPerDay;
  }

  Serial.printf("Settings v%u applied: tempMax=%.1f humMax=%.1f lights=%u-%u pumpTrigger=%.1f%%\n",
    settings.version,
    settings.thresholds.tempMaxC, settings.thresholds.humidityMaxPct,
    settings.lights.startHour, settings.lights.endHour,
    settings.pump.triggerPct);
}

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
// Control loop — fast O(1) checks called every loop() iteration
// ---------------------------------------------------------------------------

void setActuator(uint8_t pin, bool& state, bool desired) {
  if (state != desired) {
    digitalWrite(pin, desired ? HIGH : LOW);
    state = desired;
    Serial.printf("Actuator pin %u -> %s\n", pin, desired ? "ON" : "OFF");
  }
}

void evalLights() {
  if (!ntpSynced) return;

  struct tm now;
  if (!getLocalTime(&now, 0)) return;

  uint8_t s = settings.lights.startHour;
  uint8_t e = settings.lights.endHour;
  uint8_t h = now.tm_hour;
  bool on;
  if (s == e) on = false;
  else if (s < e) on = (h >= s && h < e);
  else on = (h >= s || h < e); // wraparound (e.g., 20 -> 06)

  setActuator(LIGHT_PIN, lightsOn, on);
}

void evalFan() {
  uint32_t nowSec = millis() / 1000;

  // Start of next periodic window
  if (lastPeriodicFanStart == 0 || nowSec - lastPeriodicFanStart >= settings.fan.periodicEverySec) {
    lastPeriodicFanStart = nowSec;
    periodicFanUntil = nowSec + settings.fan.periodicDurationSec;
  }
  bool periodic = nowSec < periodicFanUntil;
  bool humidityHigh = lastHumidity > settings.fan.humidityOverridePct;
  setActuator(FAN_PIN, fanOn, periodic || humidityHigh);
}

void evalPump() {
  uint32_t nowSec = millis() / 1000;

  // Daily count reset on local-day change
  if (ntpSynced) {
    struct tm now;
    if (getLocalTime(&now, 0) && now.tm_yday != pumpsTodayYday) {
      pumpsTodayYday = now.tm_yday;
      pumpsTodayCount = 0;
      Serial.printf("Pump daily counter reset (yday=%d)\n", now.tm_yday);
    }
  }

  // Stop a running pulse when its window expires
  if (pumpOn && nowSec >= pumpRunningUntil) {
    setActuator(PUMP_PIN, pumpOn, false);
  }

  // Fire a scheduled pulse
  if (pumpScheduledAt > 0 && nowSec >= pumpScheduledAt) {
    if (pumpsTodayCount >= settings.pump.maxPulsesPerDay) {
      Serial.println("Pump scheduled trigger ABORTED — daily cap reached");
    } else {
      setActuator(PUMP_PIN, pumpOn, true);
      pumpRunningUntil = nowSec + settings.pump.pulseDurationSec;
      lastPumpAt = nowSec;
      pumpsTodayCount++;
      Serial.printf("Pump pulse #%u/%u, duration %us\n",
        pumpsTodayCount, settings.pump.maxPulsesPerDay, settings.pump.pulseDurationSec);
    }
    pumpScheduledAt = 0;
  }
}

// Called once per measurement cycle, AFTER soil moisture is read.
void maybeSchedulePump(float soilPct) {
  uint32_t nowSec = millis() / 1000;
  if (soilPct > settings.pump.triggerPct) return;
  if (lastPumpAt > 0 && nowSec - lastPumpAt < settings.pump.settleWindowSec) {
    Serial.println("Pump trigger ignored: in settle window");
    return;
  }
  if (pumpsTodayCount >= settings.pump.maxPulsesPerDay) {
    Serial.println("Pump trigger ignored: daily cap reached");
    return;
  }
  if (pumpScheduledAt > 0 || pumpOn) {
    Serial.println("Pump trigger ignored: already scheduled or running");
    return;
  }
  pumpScheduledAt = nowSec + settings.pump.delayAfterMeasurementSec;
  Serial.printf("Pump scheduled in %us (soil=%.1f%%, trigger=%.1f%%)\n",
    settings.pump.delayAfterMeasurementSec, soilPct, settings.pump.triggerPct);
}

// ---------------------------------------------------------------------------
// MQTT
// ---------------------------------------------------------------------------

void connectMqtt() {
  mqttClient.setServer(IOT_HUB_HOST, 8883);

  while (!mqttClient.connected()) {
    Serial.print("Connecting to IoT Hub MQTT...");

    if (mqttClient.connect(DEVICE_ID, IOT_HUB_MQTT_USERNAME, IOT_HUB_MQTT_PASSWORD)) {
      Serial.println(" connected");

      // Twin: subscribe to responses + future PATCHes, then request the
      // current full twin so we apply the latest settings on every connect.
      mqttClient.subscribe(TWIN_TOPIC_RES_SUB);
      mqttClient.subscribe(TWIN_TOPIC_PATCH_SUB);
      mqttClient.publish(TWIN_TOPIC_GET, "");

      String status = "{\"status\":\"online\",\"uptime_ms\":";
      status += String(millis());
      status += ",\"free_heap\":";
      status += String(ESP.getFreeHeap());
      status += "}";
      mqttClient.publish(STATUS_TOPIC, status.c_str());
    } else {
      int state = mqttClient.state();
      Serial.print(" failed, rc=");
      Serial.print(state);
      Serial.print(" (");
      Serial.print(mqttStateName(state));
      Serial.print(")");
      Serial.println();
      printTlsLastError();
      printConnectionDiagnostics();
      Serial.println(", retrying in 5s...");
      delay(5000);
    }
  }
}

void ensureMqttConnected() {
  if (mqttClient.connected()) {
    return;
  }

  Serial.println("MQTT disconnected, reconnecting...");
  connectMqtt();
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

void printHumanReadable(
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux,
  int soilMoistureRaw,
  const int16_t soilChannels[SOIL_SENSOR_COUNT]
) {
  Serial.print("Temperature: ");
  Serial.print(temperatureC, 2);
  Serial.println(" C");

  Serial.print("Humidity: ");
  Serial.print(humidityPct, 2);
  Serial.println(" %");

  Serial.print("Pressure: ");
  Serial.print(pressureHpa, 2);
  Serial.println(" hPa");

  Serial.print("Light: ");
  if (lightLux >= 0.0f) {
    Serial.print(lightLux, 2);
    Serial.println(" lux");
  } else {
    Serial.println("read failed");
  }

  Serial.print("Soil moisture raw avg: ");
  if (soilMoistureRaw >= 0) {
    Serial.println(soilMoistureRaw);
  } else {
    Serial.println("read failed");
  }

  printSoilChannels(soilChannels);
  Serial.println("---");
}

String buildTelemetryJson(
  unsigned long uptimeMs,
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux,
  int soilMoistureRaw,
  const int16_t soilChannels[SOIL_SENSOR_COUNT]
) {
  String json = "{";
  json += "\"device_id\":\"";
  json += DEVICE_ID;
  json += "\"";

  json += ",\"uptime_ms\":";
  json += String(uptimeMs);

  json += ",\"temperature_c\":";
  json += String(temperatureC, 2);

  json += ",\"humidity_pct\":";
  json += String(humidityPct, 2);

  json += ",\"pressure_hpa\":";
  json += String(pressureHpa, 2);

  json += ",\"light_lux\":";
  if (lightLux >= 0.0f) {
    json += String(lightLux, 2);
  } else {
    json += "null";
  }

  json += ",\"soil_moisture_raw\":";
  if (soilMoistureRaw >= 0) {
    json += String(soilMoistureRaw);
  } else {
    json += "null";
  }

  json += ",\"soil_moisture_channels\":";
  if (soilMoistureRaw >= 0) {
    json += "[";
    for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
      if (i > 0) json += ",";
      json += String(soilChannels[i]);
    }
    json += "]";
  } else {
    json += "null";
  }

  json += ",\"pump_on\":";
  json += pumpOn ? "true" : "false";

  json += ",\"lights_on\":";
  json += lightsOn ? "true" : "false";

  json += ",\"fan_on\":";
  json += fanOn ? "true" : "false";
  json += "}";

  return json;
}

void publishTelemetry(const String& payload) {
  ensureWifiConnected();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Telemetry skipped: Wi-Fi not connected");
    return;
  }

  ensureMqttConnected();

  bool ok = mqttClient.publish(TELEMETRY_TOPIC, payload.c_str());
  if (ok) {
    Serial.println("Telemetry published to IoT Hub");
  } else {
    Serial.println("Telemetry publish failed");
  }
}

// ---------------------------------------------------------------------------
// Setup & Loop
// ---------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(FAN_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(LIGHT_PIN, LOW);
  digitalWrite(PUMP_PIN, LOW);

  Wire.begin(21, 22);

  bool bmeOk = initBme280();
  bool bhOk = initBh1750();
  adsOk = initAds1115();

  if (!bmeOk) {
    Serial.println("BME280 init failed.");
    while (true) delay(1000);
  }

  if (!bhOk) {
    Serial.println("BH1750 init failed.");
    while (true) delay(1000);
  }

  if (!adsOk) {
    Serial.println("ADS1115 init failed. Soil moisture will be reported as null.");
  }

  connectWifi();
  initTime();

  // TLS: skip certificate verification (personal project).
  wifiClient.setInsecure();
  mqttClient.setBufferSize(2048);
  mqttClient.setCallback(mqttCallback);

  connectMqtt();

  Serial.println("ESP32 telemetry firmware started (IoT Hub MQTT).");
}

void loop() {
  mqttClient.loop();

  // Fast control loop — runs every iteration, O(1) work
  evalLights();
  evalFan();
  evalPump();

  unsigned long now = millis();
  if (now - lastReadMs < READ_INTERVAL_MS) {
    return;
  }

  lastReadMs = now;

  float temperatureC = bme.readTemperature();
  float humidityPct = bme.readHumidity();
  float pressureHpa = bme.readPressure() / 100.0f;
  float lightLux = readLightLux();
  int16_t soilChannels[SOIL_SENSOR_COUNT];
  int soilMoistureRaw = readSoilMoistureRaw(soilChannels);

  bool bmeValid =
    !isnan(temperatureC) &&
    !isnan(humidityPct) &&
    !isnan(pressureHpa);

  if (!bmeValid) {
    Serial.println("BME280 read failed.");
    return;
  }

  // Update inputs the control evaluators consume on subsequent iterations,
  // and feed the fresh soil reading into the pump scheduler.
  lastHumidity = humidityPct;
  lastSoilPct = rawToSoilPercent(soilMoistureRaw);
  maybeSchedulePump(lastSoilPct);

  printHumanReadable(temperatureC, humidityPct, pressureHpa, lightLux, soilMoistureRaw, soilChannels);

  String payload = buildTelemetryJson(
    now,
    temperatureC,
    humidityPct,
    pressureHpa,
    lightLux,
    soilMoistureRaw,
    soilChannels
  );

  Serial.println(payload);
  publishTelemetry(payload);
}
