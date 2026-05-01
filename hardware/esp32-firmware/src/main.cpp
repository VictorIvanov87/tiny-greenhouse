#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <math.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <Adafruit_ADS1X15.h>
#include "secrets.h"

Adafruit_BME280 bme;
Adafruit_ADS1115 ads;

static const uint8_t BH1750_ADDR = 0x23;
static const unsigned long READ_INTERVAL_MS = 300000; // 5 minutes

static const uint8_t FAN_PIN = 23;   // GPIO23 -> PWM1 on MOSFET module
static const uint8_t LIGHT_PIN = 18; // GPIO18 -> PWM3 on MOSFET module

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

int readSoilMoistureRaw() {
  if (!adsOk) {
    return -1;
  }

  long total = 0;
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
    total += readSoilChannelRaw(SOIL_ADS_CHANNELS[i]);
    delay(5);
  }

  return total / SOIL_SENSOR_COUNT;
}

void printSoilChannels() {
  if (!adsOk) {
    Serial.println("Soil sensors: ADS1115 not available");
    return;
  }

  Serial.print("Soil raw channels:");
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
    Serial.print(" A");
    Serial.print(SOIL_ADS_CHANNELS[i]);
    Serial.print("=");
    Serial.print(readSoilChannelRaw(SOIL_ADS_CHANNELS[i]));
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
// MQTT
// ---------------------------------------------------------------------------

void connectMqtt() {
  mqttClient.setServer(IOT_HUB_HOST, 8883);

  while (!mqttClient.connected()) {
    Serial.print("Connecting to IoT Hub MQTT...");

    if (mqttClient.connect(DEVICE_ID, IOT_HUB_MQTT_USERNAME, IOT_HUB_MQTT_PASSWORD)) {
      Serial.println(" connected");

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
  int soilMoistureRaw
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

  printSoilChannels();
  Serial.println("---");
}

String buildTelemetryJson(
  unsigned long uptimeMs,
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux,
  int soilMoistureRaw
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
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(LIGHT_PIN, LOW);

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

  // TLS: skip certificate verification (personal project).
  wifiClient.setInsecure();
  mqttClient.setBufferSize(1024);

  connectMqtt();

  Serial.println("ESP32 telemetry firmware started (IoT Hub MQTT).");
}

void loop() {
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastReadMs < READ_INTERVAL_MS) {
    return;
  }

  lastReadMs = now;

  float temperatureC = bme.readTemperature();
  float humidityPct = bme.readHumidity();
  float pressureHpa = bme.readPressure() / 100.0f;
  float lightLux = readLightLux();
  int soilMoistureRaw = readSoilMoistureRaw();

  bool bmeValid =
    !isnan(temperatureC) &&
    !isnan(humidityPct) &&
    !isnan(pressureHpa);

  if (!bmeValid) {
    Serial.println("BME280 read failed.");
    return;
  }

  printHumanReadable(temperatureC, humidityPct, pressureHpa, lightLux, soilMoistureRaw);

  String payload = buildTelemetryJson(
    now,
    temperatureC,
    humidityPct,
    pressureHpa,
    lightLux,
    soilMoistureRaw
  );

  Serial.println(payload);
  publishTelemetry(payload);
}
