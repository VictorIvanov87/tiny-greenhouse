# Tiny Greenhouse — Soil Moisture Calibration

The soil probes are capacitive HW-390 v2.0 sensors. They output an analog voltage roughly proportional to how dry the surrounding medium is — **drier soil produces a higher voltage**, fully wet soil produces a lower voltage. That voltage is read through an ADS1115 ADC (16-bit, ±4.096 V range), producing a raw integer.

## Current calibration

- `SOIL_RAW_DRY = 20000` — the raw ADC reading the user observed when the probe sat in "pretty dry" soil. Anything at or above this maps to 0%.
- `SOIL_RAW_WET = 10000` — the raw ADC reading the user observed when the probe was submerged in a cup of water. This maps to 100%.

The conversion is linear:

```
percent = (DRY - raw) / (DRY - WET) * 100
        clamped to [0, 100]
```

The calibration constants live in two synchronized places:

- Firmware: `hardware/esp32-firmware/src/config.h` (used for the local pump-trigger decision)
- Backend: `SOIL_RAW_DRY` and `SOIL_RAW_WET` environment variables (used for the percent shown in the dashboard and stored in telemetry-derived views)

Both layers must stay in sync. Raw values are stored in Firestore, so changing the env vars retroactively re-derives percent for all historical samples on read.

## What 0% and 100% actually mean

- **0%** does NOT mean "physically zero water". It means "as dry as the dry calibration point". With the prototype calibrated against in-soil dryness (not bone-dry air), 0% should correspond to soil that needs water now.
- **100%** corresponds to a probe in standing water. Soil that drains normally rarely sits there for long.
- "Pretty dry but still alive" potting mix sits somewhere around 20–40% on this scale.
- "Comfortably moist" soil for most crops sits around 50–70%.
- "Just watered" soil typically reads 80–95% for a few hours before declining.

## Per-channel variation is normal

The four capacitive probes are individually slightly different (manufacturing variance and oscillator drift). Readings can vary by 10–25% between probes in the same conditions. The dashboard uses the **average**, which smooths out a single bad probe. The backend stores all four channels separately for diagnostics.

## Why the user sees "still wet" when the soil looks dry

Capacitive sensors measure the dielectric constant of the surrounding material. Dry-looking topsoil can still hold significant water around the grains, and the dielectric responds nonlinearly — modest moisture content already pushes the reading well up the scale. A 50–60% reading in soil that feels dry to the touch is usually the sensor honestly reporting "there's still moisture down where my tip is".
