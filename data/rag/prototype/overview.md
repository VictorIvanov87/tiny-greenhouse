# Tiny Greenhouse — Prototype Overview

The Tiny Greenhouse is a small autonomous indoor growing prototype. It is designed to grow a handful of plants on a desk or shelf while monitoring environment and soil moisture automatically and watering them when needed.

## What the prototype does

- Continuously monitors air temperature, humidity, atmospheric pressure, ambient light, and soil moisture across four pots.
- Captures hourly photos of the plants with an onboard camera.
- Decides when to water the plants based on configurable soil-moisture thresholds, and runs a small pump from a built-in reservoir.
- Streams telemetry every 5 minutes to a backend, which stores the history and powers the dashboard plus this assistant.

## Physical container

- Small enclosure sized for 1–4 pots (typical pot volume around 1–3 L each).
- Open top with a transparent or removable cover for light and airflow.
- Internal mounting points for sensors, camera, pump, and reservoir.
- Powered from a single USB / wall adapter; everything inside runs at 3.3 V or 5 V.

## What is NOT in scope

- No outdoor weatherproofing — the prototype is for indoor use only.
- No CO₂ injection, no nutrient dosing, and no automated lighting schedule beyond simple on/off control.
- No heating or active cooling — temperature is observed, not actively regulated.

## Why this matters when answering questions

When the user asks "what does this thing do?", "what sensors are inside?", "how does watering work?", or "what's in the reservoir?", the answer lives in the prototype docs (this file plus `sensors.md`, `camera.md`, `actuators.md`, `sampling-and-control.md`, `calibration.md`), not in the per-plant guides.
