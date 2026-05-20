# Tiny Greenhouse — Sensors

All sensors live on the ESP32-Main board and report into the same 5-minute telemetry sample. Each telemetry record carries the values described below.

## BME280 — air sensor (I²C)

- **Temperature** in °C, ±1 °C accuracy.
- **Relative humidity** in %, ±3% accuracy.
- **Atmospheric pressure** in hPa.
- One unit, mounted in free air inside the enclosure. Used as the canonical reading for the climate inside the greenhouse.

## BH1750FVI — ambient light (I²C address 0x23)

- **Illuminance** in lux. Range covers low indoor light (a few lux) up to full sunlight on a window sill (tens of thousands of lux).
- Used to estimate how much usable light the plants are receiving.
- The backend also derives a daily "light hours" estimate from this value.

## HW-390 v2.0 — capacitive soil moisture × 4 (analog, via ADS1115)

- Four identical capacitive soil probes, one per pot.
- All four are read by an ADS1115 16-bit ADC over I²C, on channels A0..A3.
- The ESP32 averages the four raw channels into a single `soil_moisture_raw` value sent in telemetry, and also sends the per-channel array in `soil_moisture_channels`.
- The probes are powered from 3.3 V; their analog output range is roughly 0–3 V.
- See `calibration.md` for how the raw ADC reading is mapped to a 0–100% moisture value.

## Water-level switch — reservoir status

- A simple low/high switch reports whether the internal water reservoir is empty.
- Surfaced in telemetry as `waterLevelLow: true` when the reservoir needs a refill.
- This is what powers the "needs water" alert on the dashboard.

## Reading cadence

- All sensors are sampled together once every 5 minutes (`READ_INTERVAL_MS = 300000`).
- Sensor errors (failed reads, I²C timeouts, missing ADS1115) are surfaced through a `sensorError: true` flag in the sample.

## Typical indoor ranges

When answering questions about what's "normal", these are the bands the prototype usually sits in for healthy indoor growing:

- Temperature: 18–28 °C
- Humidity: 40–70%
- Pressure: 980–1030 hPa (only useful as a relative trend)
- Light: 200–20000 lux depending on grow lights / window placement
- Soil moisture: 30–80% on the calibrated scale, depending on crop and stage
