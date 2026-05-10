#include "control.h"

#include "config.h"
#include "sensors.h"
#include "net.h"

ControlSettings settings;

bool pumpOn = false;
bool lightsOn = false;
bool fanOn = false;
bool waterLevelLow = false;

// Control state — uptime-based seconds, lost on reboot (acceptable: trigger
// logic + cooldown prevent runaway pumping even with a reset counter).
static uint32_t lastPeriodicFanStart = 0;
static uint32_t periodicFanUntil = 0;
static uint32_t lastPumpAt = 0;
static uint32_t pumpScheduledAt = 0;
static uint32_t pumpRunningUntil = 0;
static uint16_t pumpsTodayCount = 0;
static int pumpsTodayYday = -1;

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

  // Humidity override only if BME280 is healthy; otherwise rely on periodic only
  bool humidityHigh = bme280Healthy && (lastHumidity > settings.fan.humidityOverridePct);

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
