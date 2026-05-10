#include <Arduino.h>
#include <Wire.h>
#include <esp_task_wdt.h>

#include "config.h"
#include "control.h"
#include "net.h"
#include "sensors.h"
#include "telemetry.h"

static unsigned long lastReadMs = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  pinMode(FAN_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(WATER_LEVEL_PIN, INPUT_PULLUP);
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(LIGHT_PIN, LOW);
  digitalWrite(PUMP_PIN, LOW);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  bool bmeOk = initBme280();
  bool bhOk = initBh1750();
  adsOk = initAds1115();

  // No longer halt on sensor init failure. Mark as unhealthy and continue.
  if (!bmeOk) {
    Serial.println("BME280 init failed. Temperature/humidity/pressure will be null.");
    bme280Healthy = false;
  }

  if (!bhOk) {
    Serial.println("BH1750 init failed. Light readings will be null.");
    bh1750Healthy = false;
  }

  if (!adsOk) {
    Serial.println("ADS1115 init failed. Soil moisture will be reported as null.");
  }

  updateSensorErrorFlag();

  connectWifi();
  initTime();

  // TLS: skip certificate verification (personal project).
  wifiClient.setInsecure();
  mqttClient.setBufferSize(2048);
  mqttClient.setCallback(mqttCallback);

  connectMqtt();

  // Task watchdog: panic-reset if loop() stops feeding for WDT_TIMEOUT_S.
  // Registered last so the long initial connectMqtt() above isn't subject
  // to it (we want first-boot to wait for connectivity).
  esp_task_wdt_init(WDT_TIMEOUT_S, true);
  esp_task_wdt_add(NULL);

  Serial.println("ESP32 telemetry firmware started (IoT Hub MQTT).");
  if (sensorError) {
    Serial.println("WARNING: one or more sensors failed init. Check wiring.");
  }
}

void loop() {
  esp_task_wdt_reset();

  mqttClient.loop();

  // Fast control loop — runs every iteration, O(1) work
  evalLights();
  evalFan();
  evalPump();

  // Cheap, throttled internally — safe to call every iteration
  tryReinitDisabledSensors();

  unsigned long now = millis();
  if (now - lastReadMs < READ_INTERVAL_MS) return;

  lastReadMs = now;

  // --- Read sensors (skip disabled ones) ---

  float temperatureC = 0.0f;
  float humidityPct = 0.0f;
  float pressureHpa = 0.0f;

  if (bme280Healthy) {
    temperatureC = readTemperatureC();
    humidityPct = readHumidityPct();
    pressureHpa = readPressureHpa() / 100.0f;

    if (isValidBME280(temperatureC, humidityPct, pressureHpa)) {
      bme280ErrorCount = 0;
      lastHumidity = humidityPct;
    } else {
      handleBME280Error(temperatureC, humidityPct, pressureHpa);
      // Do NOT update lastHumidity with bad data; fan control keeps using
      // the last known good value or falls back to periodic-only.
    }
  }

  float lightLux = readLightLux();
  if (bh1750Healthy) {
    if (isValidBH1750(lightLux)) {
      bh1750ErrorCount = 0;
    } else {
      handleBH1750Error(lightLux);
    }
  }

  int16_t soilChannels[SOIL_SENSOR_COUNT];
  int soilMoistureRaw = readSoilMoistureRaw(soilChannels);

  // Read float switch on every measurement cycle. Fast, no debounce needed —
  // floats stabilize in milliseconds and the 5-min cadence is the rate-limit.
  waterLevelLow = (digitalRead(WATER_LEVEL_PIN) == HIGH) == WATER_LEVEL_LOW_WHEN_HIGH;

  if (soilMoistureRaw >= 0) {
    lastSoilPct = rawToSoilPercent(soilMoistureRaw);
    maybeSchedulePump(lastSoilPct);
  }

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
