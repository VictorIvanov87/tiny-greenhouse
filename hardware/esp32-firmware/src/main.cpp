#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <math.h>

Adafruit_BME280 bme;

static const uint8_t BH1750_ADDR = 0x23;
static const unsigned long READ_INTERVAL_MS = 3000;

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

void printJson(unsigned long uptimeMs, float temperatureC, float humidityPct, float pressureHpa, float lightLux) {
  Serial.print("{\"uptime_ms\":");
  Serial.print(uptimeMs);
  Serial.print(",\"temperature_c\":");
  Serial.print(temperatureC, 2);
  Serial.print(",\"humidity_pct\":");
  Serial.print(humidityPct, 2);
  Serial.print(",\"pressure_hpa\":");
  Serial.print(pressureHpa, 2);
  Serial.print(",\"light_lux\":");
  if (lightLux >= 0.0f) {
    Serial.print(lightLux, 2);
  } else {
    Serial.print("null");
  }
  Serial.print(",\"soil_moisture_raw\":null");
  Serial.println("}");
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

  Serial.println("Milestone 2 telemetry firmware started.");
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
  printJson(now, temperatureC, humidityPct, pressureHpa, lightLux);
}