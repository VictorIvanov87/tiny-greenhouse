# Tiny Greenhouse — Actuators

The prototype can do three things to its plants: water them, ventilate them, and light them.

## Water pump + reservoir

- Small 3–5 V diaphragm pump drawing from a built-in water reservoir inside the enclosure.
- Reservoir capacity covers several days to ~1–2 weeks of watering, depending on plant load and climate.
- Refill is manual — the `waterLevelLow` flag in telemetry tells the user when.
- A short pump pulse delivers a small volume of water per cycle; the firmware does not measure flow.
- Pump state is surfaced in telemetry as `pumpOn: true/false`.

### When the pump runs

- Triggered automatically when the **averaged soil moisture** drops below the user-configured `triggerPct` (see "Soil thresholds" in greenhouse control settings).
- A measurement-to-pump delay (`delayAfterMeasurementSec`) prevents the pump from firing the instant a low reading arrives.
- The user can also override this by setting per-greenhouse `soilMoisturePctMin` and `soilMoisturePctMax` thresholds.

## Fan

- A small DC fan, used to circulate air inside the enclosure.
- Controlled on/off by firmware.
- Telemetry reports `fanOn: true/false`.
- Typically used to keep humidity from creeping too high or to even out temperature.

## Grow light

- A simple LED grow light fixture, on/off controlled.
- Telemetry reports `lightsOn: true/false`.
- The light is what drives the daily "light hours" total when the BH1750 reads above a usable threshold.

## What the assistant should NOT promise

- The prototype cannot pump a precise amount of water — only "run a pulse" and re-measure.
- There is no dosing, no nutrient injection, no thermostat-based heater, no humidifier, and no cooler.
- The grow light has no schedule sophistication beyond on/off; complex photoperiod programs are not configured here.
