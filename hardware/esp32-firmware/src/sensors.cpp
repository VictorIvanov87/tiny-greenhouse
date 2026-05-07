#include "sensors.h"

#include <Wire.h>
#include <math.h>

Adafruit_BME280 bme;
Adafruit_ADS1115 ads;

bool bme280Healthy = true;
uint8_t bme280ErrorCount = 0;

bool bh1750Healthy = true;
uint8_t bh1750ErrorCount = 0;

bool adsOk = false;

bool sensorError = false;

float lastHumidity = 0.0f;
float lastSoilPct = 100.0f; // start "wet" so we don't pump before the first reading

static unsigned long lastReinitAttemptMs = 0;

void updateSensorErrorFlag() {
  sensorError = !bme280Healthy || !bh1750Healthy || !adsOk;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// BME280 physical limits per datasheet: temp -40..+85, hum 0..100, pres 300..1100
bool isValidBME280(float tempC, float humPct, float presHpa) {
  if (isnan(tempC) || isnan(humPct) || isnan(presHpa)) return false;
  if (tempC < -40.0f || tempC > 85.0f) return false;
  if (humPct < 0.0f || humPct > 100.0f) return false;
  if (presHpa < 300.0f || presHpa > 1100.0f) return false;
  return true;
}

// BH1750 range: 0..65535 lux (16-bit). Negative means read failure.
bool isValidBH1750(float lux) {
  if (lux < 0.0f || lux > 65535.0f) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

bool initBme280() {
  return bme.begin(0x76);
}

bool initBh1750() {
  Wire.beginTransmission(BH1750_ADDR);
  Wire.write(0x10); // continuous high-res mode
  if (Wire.endTransmission() != 0) return false;

  // Verify the sensor actually returns a sane sample. A sensor that's pulling
  // SDA low can ACK the config write but never return real data.
  delay(180);
  Wire.requestFrom(BH1750_ADDR, (uint8_t)2);
  if (Wire.available() != 2) return false;
  uint16_t raw = ((uint16_t)Wire.read() << 8) | Wire.read();
  return isValidBH1750(raw / 1.2f);
}

bool initAds1115() {
  if (!ads.begin(0x48)) return false;
  ads.setGain(GAIN_ONE); // +/- 4.096 V range, good for 3.3 V analog sensors.
  return true;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

float readLightLux() {
  if (!bh1750Healthy) return -1.0f;

  delay(180);
  Wire.requestFrom(BH1750_ADDR, (uint8_t)2);
  if (Wire.available() == 2) {
    uint16_t raw = ((uint16_t)Wire.read() << 8) | Wire.read();
    return raw / 1.2f;
  }
  return -1.0f;
}

static int16_t readSoilChannelRaw(uint8_t channel) {
  return ads.readADC_SingleEnded(channel);
}

int readSoilMoistureRaw(int16_t outChannels[SOIL_SENSOR_COUNT]) {
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) outChannels[i] = -1;
  if (!adsOk) return -1;

  long total = 0;
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
    outChannels[i] = readSoilChannelRaw(SOIL_ADS_CHANNELS[i]);
    total += outChannels[i];
    delay(5);
  }
  return total / SOIL_SENSOR_COUNT;
}

void printSoilChannels(const int16_t channels[SOIL_SENSOR_COUNT]) {
  if (!adsOk) {
    Serial.println("Soil sensors: ADS1115 not available");
    return;
  }

  Serial.print("Soil raw channels:");
  for (uint8_t i = 0; i < SOIL_SENSOR_COUNT; i++) {
    Serial.print(" A");
    Serial.print(SOIL_ADS_CHANNELS[i]);
    Serial.print("=");
    Serial.print(channels[i]);
  }
  Serial.println();
}

float rawToSoilPercent(int raw) {
  if (raw <= 0) return 0.0f;
  float pct = ((SOIL_RAW_DRY - (float)raw) / (SOIL_RAW_DRY - SOIL_RAW_WET)) * 100.0f;
  if (pct < 0.0f) return 0.0f;
  if (pct > 100.0f) return 100.0f;
  return pct;
}

// ---------------------------------------------------------------------------
// I2C recovery
// ---------------------------------------------------------------------------

// Sends 9 clock pulses on SCL to release a stuck I2C slave that is holding
// SDA low. Called before giving up on a sensor.
void i2cBusRecovery() {
  Serial.println("I2C bus recovery: sending 9 clock pulses on SCL");
  Wire.end();
  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, OUTPUT);
  for (int i = 0; i < 9; i++) {
    digitalWrite(I2C_SCL_PIN, HIGH);
    delayMicroseconds(5);
    digitalWrite(I2C_SCL_PIN, LOW);
    delayMicroseconds(5);
  }
  digitalWrite(I2C_SCL_PIN, HIGH);
  delayMicroseconds(5);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  // Sensor on-chip mode/oversampling registers may have reverted to defaults
  // if the sensor power-cycled during the fault. Re-apply driver-side config
  // for any sensor that was healthy before the fault.
  if (bme280Healthy) bme.begin(0x76);
  if (adsOk) {
    if (ads.begin(0x48)) ads.setGain(GAIN_ONE);
  }
  if (bh1750Healthy) {
    Wire.beginTransmission(BH1750_ADDR);
    Wire.write(0x10);
    Wire.endTransmission();
  }

  Serial.println("I2C bus recovery complete, bus re-initialized");
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

void handleBME280Error(float tempC, float humPct, float presHpa) {
  bme280ErrorCount++;
  Serial.printf("BME280 bad reading #%u: temp=%.1f hum=%.1f pres=%.1f\n",
    bme280ErrorCount, tempC, humPct, presHpa);

  if (bme280ErrorCount >= SENSOR_ERROR_THRESHOLD) {
    bme280Healthy = false;
    updateSensorErrorFlag();
    Serial.println("BME280 DISABLED after consecutive bad readings. "
                   "Check wiring or replace sensor.");
  } else {
    i2cBusRecovery();
  }
}

void handleBH1750Error(float lux) {
  bh1750ErrorCount++;
  Serial.printf("BH1750 bad reading #%u: lux=%.1f\n", bh1750ErrorCount, lux);

  if (bh1750ErrorCount >= SENSOR_ERROR_THRESHOLD) {
    bh1750Healthy = false;
    updateSensorErrorFlag();
    Serial.println("BH1750 DISABLED after consecutive bad readings. "
                   "Check wiring or replace sensor.");
  } else {
    i2cBusRecovery();
  }
}

// Periodically retry init for any sensor that was disabled. Lets a sensor
// recover from a transient fault (loose wire, brown-out) without rebooting.
void tryReinitDisabledSensors() {
  if (bme280Healthy && bh1750Healthy && adsOk) return;

  unsigned long now = millis();
  if (lastReinitAttemptMs != 0 && now - lastReinitAttemptMs < SENSOR_REINIT_INTERVAL_MS) return;
  lastReinitAttemptMs = now;

  Serial.println("Attempting to re-init disabled sensors...");

  if (!bme280Healthy && initBme280()) {
    bme280Healthy = true;
    bme280ErrorCount = 0;
    Serial.println("BME280 RECOVERED");
  }
  if (!bh1750Healthy && initBh1750()) {
    bh1750Healthy = true;
    bh1750ErrorCount = 0;
    Serial.println("BH1750 RECOVERED");
  }
  if (!adsOk && initAds1115()) {
    adsOk = true;
    Serial.println("ADS1115 RECOVERED");
  }

  updateSensorErrorFlag();
}
