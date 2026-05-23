#include "sensors.h"

#include <Wire.h>
#include <math.h>
#include <string.h>

Adafruit_BME280 bme;
Adafruit_BMP280 bmp;
Adafruit_ADS1115 ads;

bool bme280Healthy = true;
uint8_t bme280ErrorCount = 0;

bool bh1750Healthy = true;
uint8_t bh1750ErrorCount = 0;

bool adsOk = false;

bool sensorError = false;
bool bmp280Mode = false;

float lastHumidity = 0.0f;
float lastSoilPct = 100.0f; // start "wet" so we don't pump before the first reading

static unsigned long lastReinitAttemptMs = 0;

// Frozen-reading detector state. A counterfeit/defective BME280 can return
// bit-identical compensated values across reads — physical chips with x16
// oversampling always jitter in the low bits, so identical IEEE-754 bit
// patterns across consecutive reads is a clear "chip not converting" signal.
static float prevTempC = NAN;
static float prevHumPct = NAN;
static float prevPresHpa = NAN;
static uint8_t staleReadCount = 0;
static const uint8_t STALE_READ_THRESHOLD = 3;

static void resetStaleTracking() {
  prevTempC = NAN;
  prevHumPct = NAN;
  prevPresHpa = NAN;
  staleReadCount = 0;
}

static bool bitwiseEqualFloat(float a, float b) {
  uint32_t ai, bi;
  memcpy(&ai, &a, sizeof(ai));
  memcpy(&bi, &b, sizeof(bi));
  return ai == bi;
}

void updateSensorErrorFlag() {
  sensorError = !bme280Healthy || !bh1750Healthy || !adsOk;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// BME280 physical limits per datasheet: temp -40..+85, hum 0..100, pres 300..1100.
// Pressure range is intentionally tighter than the datasheet: the greenhouse
// lives at a fixed Bulgarian location (sea level → ~1500 m max), so any value
// outside [870, 1080] hPa is the sensor lying, not the weather. Catches the
// classic counterfeit-BME280 frozen-at-673-hPa failure mode and routes it
// through the existing error-recovery path.
// In bmp280Mode (BMP280 fallback), the chip has no humidity sensor — humPct will
// be NAN and is intentionally not part of validity.
bool isValidBME280(float tempC, float humPct, float presHpa) {
  if (isnan(tempC) || isnan(presHpa)) return false;
  if (!bmp280Mode && isnan(humPct)) return false;
  if (tempC < -40.0f || tempC > 85.0f) return false;
  if (!bmp280Mode && (humPct < 0.0f || humPct > 100.0f)) return false;
  if (presHpa < 870.0f || presHpa > 1080.0f) return false;
  return true;
}

// Returns true when the last STALE_READ_THRESHOLD reads (this one included)
// have been bit-identical to the previous reading. Healthy sensors never do
// this — even with x16 oversampling there is sub-LSB ADC noise. In bmp280Mode
// the humidity field is always NaN, so we skip it in the comparison.
bool isStaleBME280(float tempC, float humPct, float presHpa) {
  bool same = bitwiseEqualFloat(tempC, prevTempC) &&
              bitwiseEqualFloat(presHpa, prevPresHpa);
  if (!bmp280Mode) {
    same = same && bitwiseEqualFloat(humPct, prevHumPct);
  }

  prevTempC = tempC;
  prevHumPct = humPct;
  prevPresHpa = presHpa;

  if (same) {
    staleReadCount++;
    return staleReadCount >= STALE_READ_THRESHOLD;
  }
  staleReadCount = 0;
  return false;
}

// BH1750 range: 0..65535 lux (16-bit). Negative means read failure.
bool isValidBH1750(float lux) {
  if (lux < 0.0f || lux > 65535.0f) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

// Try BME280 first (chip ID 0x60); fall back to BMP280 (chip ID 0x58) if the
// physical sensor on the I2C bus is a BMP280. Lets the firmware run on either
// without a code change — useful while a BME280 swap is pending.
//
// Adafruit's begin() is permissive (accepts chip ID 0x60 or 0x61 for BME280),
// so a counterfeit module that reports a wrong ID would still slip through.
// We print the sensorID() byte so the serial log makes the silicon identity
// unambiguous when diagnosing dead/clone sensors.
bool initBme280() {
  resetStaleTracking();

  if (bme.begin(0x76)) {
    bmp280Mode = false;
    Serial.printf("BME280 detected at 0x76 (chip ID 0x%02X)\n", bme.sensorID());
    return true;
  }
  if (bmp.begin(0x76)) {
    bmp280Mode = true;
    Serial.printf("BMP280 detected at 0x76 (chip ID 0x%02X) — humidity readings will be null\n",
                  bmp.sensorID());
    return true;
  }
  Serial.println("No BME280/BMP280 responded at 0x76");
  return false;
}

float readTemperatureC() {
  return bmp280Mode ? bmp.readTemperature() : bme.readTemperature();
}

float readHumidityPct() {
  return bmp280Mode ? NAN : bme.readHumidity();
}

float readPressureHpa() {
  return bmp280Mode ? bmp.readPressure() : bme.readPressure();
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
