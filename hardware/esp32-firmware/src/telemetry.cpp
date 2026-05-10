#include "telemetry.h"

#include "control.h"
#include "net.h"
#include "sensors.h"

void printHumanReadable(
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux,
  int soilMoistureRaw,
  const int16_t soilChannels[SOIL_SENSOR_COUNT]
) {
  if (bme280Healthy) {
    Serial.print("Temperature: ");
    Serial.print(temperatureC, 2);
    Serial.println(" C");

    Serial.print("Humidity: ");
    Serial.print(humidityPct, 2);
    Serial.println(" %");

    Serial.print("Pressure: ");
    Serial.print(pressureHpa, 2);
    Serial.println(" hPa");
  } else {
    Serial.println("BME280: DISABLED");
  }

  Serial.print("Light: ");
  if (bh1750Healthy && lightLux >= 0.0f) {
    Serial.print(lightLux, 2);
    Serial.println(" lux");
  } else if (!bh1750Healthy) {
    Serial.println("DISABLED");
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

  if (sensorError) {
    Serial.println("WARNING: one or more sensors disabled");
  }

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

  // BME280 values: null if sensor is disabled OR if any individual reading is
  // NaN (e.g., BMP280 fallback has no humidity sensor → humidity is always NaN).
  // JSON has no NaN literal, so we must emit `null` to keep the payload valid.
  json += ",\"temperature_c\":";
  json += (bme280Healthy && !isnan(temperatureC)) ? String(temperatureC, 2) : "null";
  json += ",\"humidity_pct\":";
  json += (bme280Healthy && !isnan(humidityPct)) ? String(humidityPct, 2) : "null";
  json += ",\"pressure_hpa\":";
  json += (bme280Healthy && !isnan(pressureHpa)) ? String(pressureHpa, 2) : "null";

  // BH1750 value: null if sensor is disabled or read failed
  json += ",\"light_lux\":";
  if (bh1750Healthy && lightLux >= 0.0f) {
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

  json += ",\"water_level_low\":";
  json += waterLevelLow ? "true" : "false";

  // Sensor health flag: lets the backend generate an alert
  json += ",\"sensor_error\":";
  json += sensorError ? "true" : "false";

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
