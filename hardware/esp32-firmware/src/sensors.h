#pragma once

#include <Arduino.h>
#include <Adafruit_BME280.h>
#include <Adafruit_ADS1X15.h>
#include "config.h"

// Driver instances (defined in sensors.cpp)
extern Adafruit_BME280 bme;
extern Adafruit_ADS1115 ads;

// Health state
extern bool bme280Healthy;
extern bool bh1750Healthy;
extern bool adsOk;
extern uint8_t bme280ErrorCount;
extern uint8_t bh1750ErrorCount;
extern bool sensorError;

// Last-known-good readings consumed by control evaluators
extern float lastHumidity;
extern float lastSoilPct;

// Initialization
bool initBme280();
bool initBh1750();
bool initAds1115();

// Reads
float readLightLux();
int readSoilMoistureRaw(int16_t outChannels[SOIL_SENSOR_COUNT]);
void printSoilChannels(const int16_t channels[SOIL_SENSOR_COUNT]);

// Validation
bool isValidBME280(float tempC, float humPct, float presHpa);
bool isValidBH1750(float lux);

// Error handling — increments counter, runs I2C recovery, disables on threshold
void handleBME280Error(float tempC, float humPct, float presHpa);
void handleBH1750Error(float lux);

// I2C bus recovery (9 SCL pulses + driver re-init)
void i2cBusRecovery();

// Periodic re-init attempt for disabled sensors
void tryReinitDisabledSensors();

// Soil raw -> percent (mirrors backend rawToSoilPercent)
float rawToSoilPercent(int raw);

// Recompute the combined sensorError flag from individual health flags
void updateSensorErrorFlag();
