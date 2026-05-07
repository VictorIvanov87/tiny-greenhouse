#pragma once

#include <Arduino.h>
#include "config.h"

void printHumanReadable(
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux,
  int soilMoistureRaw,
  const int16_t soilChannels[SOIL_SENSOR_COUNT]
);

String buildTelemetryJson(
  unsigned long uptimeMs,
  float temperatureC,
  float humidityPct,
  float pressureHpa,
  float lightLux,
  int soilMoistureRaw,
  const int16_t soilChannels[SOIL_SENSOR_COUNT]
);

void publishTelemetry(const String& payload);
