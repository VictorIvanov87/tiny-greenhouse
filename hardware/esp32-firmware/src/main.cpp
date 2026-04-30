#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <math.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include "secrets.h"

Adafruit_BME280 bme;

static const uint8_t BH1750_ADDR = 0x23;
static const unsigned long READ_INTERVAL_MS = 300000; // 5 minutes

static const char* DEVICE_ID = IOT_HUB_DEVICE_ID;

// IoT Hub D2C topic — messageType property lets the backend route the message
static const char* TELEMETRY_TOPIC = "devices/esp32-main-1/messages/events/$.ct=application%2Fjson&$.ce=utf-8&messageType=telemetry";
static const char* STATUS_TOPIC = "devices/esp32-main-1/messages/events/$.ct=application%2Fjson&$.ce=utf-8&messageType=status";

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastReadMs = 0;

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

float readLightLux() {
  delay(180);

  Wire.requestFrom(BH1750_ADDR, (uint8_t)2);
  if (Wire.available() == 2) {
    uint16_t raw = ((uint16_t)Wire.read() << 8) | Wire.read();
    return raw / 1.2f;
  }

  return -1.0f;
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

      // Publish a status message on connect
      String status = "{\"status\":\"online\",\"uptime_ms\":";
      status += String(millis());
      status += ",\"free_heap\":";
      status += String(ESP.getFreeHeap());
      status += "}";
      mqttClient.publish(STATUS_TOPIC, status.c_str());
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqttClient.state());
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

void printHumanReadable(float temperatureC, float humidityPct, float pressureHpa, float lightLux) {
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

  Serial.println("---");
}

String buildTelemetryJson(
  unsigned long uptimeMs,
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux
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

  json += ",\"soil_moisture_raw\":null";
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

  Wire.begin(21, 22);

  bool bmeOk = initBme280();
  bool bhOk = initBh1750();

  if (!bmeOk) {
    Serial.println("BME280 init failed.");
    while (true) delay(1000);
  }

  if (!bhOk) {
    Serial.println("BH1750 init failed.");
    while (true) delay(1000);
  }

  connectWifi();

  // TLS: skip certificate verification (personal project)
  wifiClient.setInsecure();

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

  bool bmeValid =
    !isnan(temperatureC) &&
    !isnan(humidityPct) &&
    !isnan(pressureHpa);

  if (!bmeValid) {
    Serial.println("BME280 read failed.");
    return;
  }

  printHumanReadable(temperatureC, humidityPct, pressureHpa, lightLux);

  String payload = buildTelemetryJson(
    now,
    temperatureC,
    humidityPct,
    pressureHpa,
    lightLux
  );

  Serial.println(payload);
  publishTelemetry(payload);
}
