#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

static const uint8_t BH1750_ADDR = 0x23;
static const unsigned long READ_INTERVAL_MS = 300000; // 5 minutes

static const char* WIFI_SSID = "A1_A3D2";
static const char* WIFI_PASSWORD = "61450653";
static const char* TELEMETRY_URL = "http://192.168.0.4:3000/api/telemetry";
static const char* DEVICE_ID = "esp32-main-1";

unsigned long lastReadMs = 0;

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

void printJsonLine(const String& json) {
  Serial.println(json);
}

void postTelemetry(const String& payload) {
  ensureWifiConnected();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Telemetry upload skipped: Wi-Fi not connected");
    return;
  }

  HTTPClient http;
  http.begin(TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  Serial.print("Telemetry HTTP status: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Telemetry response:");
    Serial.println(response);
  } else {
    Serial.print("Telemetry POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

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

  Serial.println("ESP32 telemetry upload firmware started.");
}

void loop() {
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

  printJsonLine(payload);
  postTelemetry(payload);
}