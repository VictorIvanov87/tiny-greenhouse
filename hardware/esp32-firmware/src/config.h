#pragma once

#include <Arduino.h>

// I2C
static const uint8_t I2C_SDA_PIN = 21;
static const uint8_t I2C_SCL_PIN = 22;
static const uint8_t BH1750_ADDR = 0x23;

// Actuator pins (GPIOs -> MOSFET module channels)
static const uint8_t FAN_PIN = 23;
static const uint8_t PUMP_PIN = 19;
static const uint8_t LIGHT_PIN = 18;

// Water level sensor (digital float switch on GPIO27 with INPUT_PULLUP).
// On this device the float switch is wired NC: pin reads LOW when the float
// drops (water low) and HIGH when the float lifts (water OK). Flip
// WATER_LEVEL_LOW_WHEN_HIGH if your switch wiring is opposite.
static const uint8_t WATER_LEVEL_PIN = 27;
static const bool WATER_LEVEL_LOW_WHEN_HIGH = false;

// Timing
static const unsigned long READ_INTERVAL_MS = 300000; // 5 minutes
static const uint32_t WDT_TIMEOUT_S = 30;

// Bulgaria timezone (EET/EEST). Lights schedule + pump daily reset use local time.
static const char* const TZ_RULE = "EET-2EEST,M3.5.0/3,M10.5.0/4";

// Soil moisture calibration on-device. MUST match the backend defaults
// (SOIL_RAW_DRY/SOIL_RAW_WET in backend/src/services/telemetry.ts) so the
// dashboard % equals the value the pump actually triggers on. Future: ship via
// twin so users can recalibrate without reflash.
static const float SOIL_RAW_DRY = 19000.0f;
static const float SOIL_RAW_WET = 9500.0f;
static const uint8_t SOIL_SENSOR_COUNT = 4;
static const uint8_t SOIL_ADS_CHANNELS[SOIL_SENSOR_COUNT] = {0, 1, 2, 3};

// Sensor health
static const uint8_t SENSOR_ERROR_THRESHOLD = 3; // consecutive bad readings before disable
static const unsigned long SENSOR_REINIT_INTERVAL_MS = 900000UL; // 15 min retry on disabled sensors
