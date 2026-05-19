#include "control.h"

#include <time.h>

#include "config.h"
#include "sensors.h"
#include "net.h"

ControlSettings settings;

bool pumpOn = false;
bool lightsOn = false;
bool fanOn = false;
bool waterLevelLow = false;

DeviceOverride lightsOverride;
DeviceOverride fanOverride;
DeviceOverride pumpOverride;

// Control state — uptime-based seconds, lost on reboot (acceptable: trigger
// logic + cooldown prevent runaway pumping even with a reset counter).
static uint32_t lastPeriodicFanStart = 0;
static uint32_t periodicFanUntil = 0;
static uint32_t lastPumpAt = 0;
static uint32_t pumpScheduledAt = 0;
static uint32_t pumpRunningUntil = 0;
static uint16_t pumpsTodayCount = 0;
static int pumpsTodayYday = -1;

static void applyOverride(JsonObjectConst v, DeviceOverride& slot, const char* label) {
  if (v.isNull()) return;

  // Explicit clear: backend sets expiresAtMs to 0 to cancel an override.
  if (!v["expiresAtMs"].isNull() && v["expiresAtMs"].as<uint64_t>() == 0) {
    if (slot.active) Serial.printf("Override %s cleared\n", label);
    slot.active = false;
    slot.expiresAtMs = 0;
    slot.desiredState = false;
    publishOverrideReport(label, slot);
    return;
  }

  // Update only fields present in this PATCH. Azure IoT Hub may send
  // delta-only patches; treating an absent field as "default" silently
  // corrupts the slot (e.g. missing `state` → desiredState gets flipped to
  // false even though the user clicked "Test ON" again).
  bool stateChanged = false;
  bool expiryChanged = false;

  if (!v["state"].isNull()) {
    const char* state = v["state"].as<const char*>();
    bool newDesired = (state && strcmp(state, "on") == 0);
    if (newDesired != slot.desiredState) stateChanged = true;
    slot.desiredState = newDesired;
  }
  if (!v["expiresAtMs"].isNull()) {
    uint64_t newExpiry = v["expiresAtMs"].as<uint64_t>();
    if (newExpiry != slot.expiresAtMs) expiryChanged = true;
    slot.expiresAtMs = newExpiry;
  }

  // The slot is active iff we have a non-zero expiry — either freshly set
  // above or already present from a prior patch.
  slot.active = (slot.expiresAtMs != 0);

  Serial.printf("Override %s parsed: active=%d desired=%s expiresAtMs=%llu (state %s, expiry %s)\n",
    label, slot.active, slot.desiredState ? "ON" : "OFF",
    (unsigned long long)slot.expiresAtMs,
    stateChanged ? "CHANGED" : "kept",
    expiryChanged ? "CHANGED" : "kept");

  publishOverrideReport(label, slot);
}

// Returns true if the override should drive the actuator on this loop tick.
// Auto-clears the slot on expiry and logs the transition.
static bool overrideActive(DeviceOverride& slot, const char* label) {
  if (!slot.active) return false;
  uint64_t now = nowEpochMs();
  if (now == 0) {
    // No reliable wall-clock yet — refuse to honour an un-bounded override.
    return false;
  }
  if (now >= slot.expiresAtMs) {
    slot.active = false;
    Serial.printf("Override %s expired, returning to schedule\n", label);
    publishOverrideReport(label, slot);
    return false;
  }
  return true;
}

void applySettings(JsonObjectConst obj) {
  // Apply incoming fields; missing fields keep current values. No version
  // gate — IoT Hub guarantees ordered delivery of twin patches.
  if (!obj["version"].isNull()) settings.version = obj["version"].as<uint32_t>();

  JsonObjectConst t = obj["thresholds"];
  if (!t.isNull()) {
    settings.thresholds.tempMinC = t["tempMinC"] | settings.thresholds.tempMinC;
    settings.thresholds.tempMaxC = t["tempMaxC"] | settings.thresholds.tempMaxC;
    settings.thresholds.humidityMinPct = t["humidityMinPct"] | settings.thresholds.humidityMinPct;
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

  JsonObjectConst ov = obj["overrides"];
  if (!ov.isNull()) {
    applyOverride(ov["lights"], lightsOverride, "lights");
    applyOverride(ov["fan"],    fanOverride,    "fan");
    applyOverride(ov["pump"],   pumpOverride,   "pump");
  }

  Serial.printf("Settings v%u applied: tempMax=%.1f humMax=%.1f lights=%u-%u pumpTrigger=%.1f%%\n",
    settings.version,
    settings.thresholds.tempMaxC, settings.thresholds.humidityMaxPct,
    settings.lights.startHour, settings.lights.endHour,
    settings.pump.triggerPct);
}

static void setActuator(uint8_t pin, bool& state, bool desired) {
  if (state != desired) {
    digitalWrite(pin, desired ? HIGH : LOW);
    state = desired;
    Serial.printf("Actuator pin %u -> %s\n", pin, desired ? "ON" : "OFF");
  }
}

void evalLights() {
  if (overrideActive(lightsOverride, "lights")) {
    setActuator(LIGHT_PIN, lightsOn, lightsOverride.desiredState);
    return;
  }

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
  if (overrideActive(fanOverride, "fan")) {
    setActuator(FAN_PIN, fanOn, fanOverride.desiredState);
    return;
  }

  uint32_t nowSec = millis() / 1000;

  // Start of next periodic window
  if (lastPeriodicFanStart == 0 || nowSec - lastPeriodicFanStart >= settings.fan.periodicEverySec) {
    lastPeriodicFanStart = nowSec;
    periodicFanUntil = nowSec + settings.fan.periodicDurationSec;
  }
  bool periodic = nowSec < periodicFanUntil;

  // Humidity override only if BME280 is healthy; otherwise rely on periodic only
  bool humidityHigh = bme280Healthy && (lastHumidity > settings.fan.humidityOverridePct);

  setActuator(FAN_PIN, fanOn, periodic || humidityHigh);
}

void evalPump() {
  uint32_t nowSec = millis() / 1000;

  // Manual override takes precedence over the schedule. Honoured for the
  // override window only; does NOT bump pumpsTodayCount or interact with
  // pumpRunningUntil so an in-flight scheduled pulse resumes cleanly when
  // the override expires. Reservoir safety is still enforced.
  if (overrideActive(pumpOverride, "pump")) {
    bool desired = pumpOverride.desiredState;
    if (desired && waterLevelLow) {
      Serial.println("Pump override refused: reservoir is low");
      desired = false;
    }
    if (pumpOn != desired) {
      Serial.printf("Pump override drive: pumpOn=%d -> %d (overrideState=%d)\n",
        pumpOn, desired, pumpOverride.desiredState);
    }
    setActuator(PUMP_PIN, pumpOn, desired);
    return;
  }

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

void maybeSchedulePump(float soilPct) {
  uint32_t nowSec = millis() / 1000;
  if (waterLevelLow) {
    Serial.println("Pump trigger ignored: reservoir is low");
    return;
  }
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
