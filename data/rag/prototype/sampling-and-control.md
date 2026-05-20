# Tiny Greenhouse — Sampling Cadence and Control Loop

## Telemetry sampling

- The ESP32-Main board reads all sensors once every **5 minutes** (`READ_INTERVAL_MS = 300000`).
- Each cycle produces a single telemetry sample posted to `/api/telemetry` with: timestamp, temperature, humidity, pressure, light lux, average soil moisture, per-channel soil moisture, and actuator state (`pumpOn`, `fanOn`, `lightsOn`, `waterLevelLow`, `sensorError`).
- Samples are stored in Firestore with a configurable retention (default 90 days).

## Camera sampling

- A separate ESP32-CAM captures one image every **1 hour**.
- Images are uploaded to Azure Blob Storage; metadata goes to Firestore.

## Soil moisture control loop

Once per telemetry cycle:

1. Read the four soil channels via ADS1115 and average them into a single raw value.
2. Convert raw to percent using the calibration (see `calibration.md`).
3. If the averaged percent is **below** the user-configured pump trigger threshold (`triggerPct`), schedule a pump pulse.
4. After waiting `delayAfterMeasurementSec`, run the pump for a short pulse.
5. Wait for the next cycle and re-measure.

The pump never runs "continuously" — it's always one short pulse, then re-measure.

## What changes when the user adjusts settings

- **`soilMoisturePctMin` / `soilMoisturePctMax`**: drive alerts and inform when watering should kick in, surfaced on the dashboard.
- **`triggerPct`**: hard cutoff the firmware uses to decide "pump now". Setting this too high can keep the soil constantly wet; too low and the plant may dry past the comfortable range before watering.
- **`delayAfterMeasurementSec`**: gives water time to absorb before re-measuring. Lower means more responsive; higher means more stable.

## When telemetry "looks wrong"

- A single bad reading every now and then is normal — capacitive probes are noisy and the BME280 can briefly spike.
- A persistent `sensorError: true` usually means I²C bus problem (often loose wiring or one sensor pulling the bus down).
- Soil channels disagreeing by >25% across the four probes triggers a backend warning — that usually means one probe has bad soil contact or has shifted, not that the average is wrong.
