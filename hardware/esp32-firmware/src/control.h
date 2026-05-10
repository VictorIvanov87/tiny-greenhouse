#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

struct ControlSettings {
  uint32_t version = 0;
  struct {
    float tempMinC = 18.0f;
    float tempMaxC = 26.0f;
    float humidityMinPct = 40.0f;
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

extern ControlSettings settings;

// Actuator state — set by the control loop, read by telemetry
extern bool pumpOn;
extern bool lightsOn;
extern bool fanOn;

// Reservoir state — refreshed each measurement cycle from the float switch on
// WATER_LEVEL_PIN. true = reservoir empty / low, blocks new pump pulses.
extern bool waterLevelLow;

// Apply incoming twin desired-property fields. Missing fields keep current values.
void applySettings(JsonObjectConst obj);

// Per-iteration evaluators (call every loop())
void evalLights();
void evalFan();
void evalPump();

// Called once per measurement cycle, AFTER soil moisture is read
void maybeSchedulePump(float soilPct);
