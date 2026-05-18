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

// Water level sensor (digital float switch on GPIO17 with INPUT_PULLUP).
// With INPUT_PULLUP, GPIO reads HIGH when the float drops (water low) for the
// typical NO float-switch wiring. Set the polarity flag to false if your
// switch is wired the opposite way (NC) and you'd rather flip in firmware
// than re-wire.
static const uint8_t WATER_LEVEL_PIN = 27;
static const bool WATER_LEVEL_LOW_WHEN_HIGH = true;

// Timing
static const unsigned long READ_INTERVAL_MS = 300000; // 5 minutes
static const uint32_t WDT_TIMEOUT_S = 30;

// Bulgaria timezone (EET/EEST). Lights schedule + pump daily reset use local time.
static const char* const TZ_RULE = "EET-2EEST,M3.5.0/3,M10.5.0/4";

// Soil moisture calibration on-device (must match backend defaults). Future:
// ship via twin so users can recalibrate without reflash.
static const float SOIL_RAW_DRY = 22000.0f;
static const float SOIL_RAW_WET = 9500.0f;
static const uint8_t SOIL_SENSOR_COUNT = 4;
static const uint8_t SOIL_ADS_CHANNELS[SOIL_SENSOR_COUNT] = {0, 1, 2, 3};

// Sensor health
static const uint8_t SENSOR_ERROR_THRESHOLD = 3; // consecutive bad readings before disable
static const unsigned long SENSOR_REINIT_INTERVAL_MS = 900000UL; // 15 min retry on disabled sensors
