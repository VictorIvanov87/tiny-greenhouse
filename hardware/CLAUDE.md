# CLAUDE.md — Hardware / Firmware

Two ESP32 boards running PlatformIO + Arduino. Both connect over Wi-Fi and talk to **Azure IoT Hub over MQTT (TLS 8883)** using device twins. Full setup lives in [README.md](README.md) — this file is the conventions/quick-reference for working in the firmware.

## Boards

| Directory | Board | Role |
|-----------|-------|------|
| `esp32-firmware/` | `esp32dev` (8 MB) | Sensors + actuators; publishes telemetry to IoT Hub every 5 min |
| `esp32-cam-firmware/` | `esp32cam` | Captures JPEG on twin command, HTTP-uploads to backend |

## Architecture (important — earlier docs were wrong)

- Telemetry is **published to Azure IoT Hub via MQTT**, not HTTP-POSTed to `/api/telemetry`.
- Device twins carry desired/reported properties (config down, status up). See `net.cpp`.
- Only the camera JPEG is uploaded over HTTP, to a URL delivered through its twin.
- Credentials come from a git-ignored `secrets.h` (copy from `secrets.example.h`), **not** hardcoded in `main.cpp`. Wi-Fi may also be provisioned at runtime via `wifi_store` (NVS).

## Source map (`esp32-firmware/src/`)

| File | Responsibility |
|------|----------------|
| `main.cpp` | setup + loop, watchdog, scheduling |
| `sensors.cpp/.h` | BME280/BMP280 + BH1750 + ADS1115 soil; health/staleness checks |
| `control.cpp/.h` | actuator rules (light schedule, pump on soil %, fan) |
| `telemetry.cpp/.h` | build JSON payload + publish to IoT Hub |
| `net.cpp/.h` | Wi-Fi + MQTT/TLS client + twin sync |
| `wifi_store.cpp/.h` | runtime Wi-Fi provisioning in NVS |
| `config.h` | pins, timing, soil calibration, `TZ_RULE` (Bulgaria EET) |
| `secrets.example.h` → `secrets.h` | Wi-Fi + IoT Hub credentials (git-ignored) |

The cam mirrors this with `camera_control.*`, `net.*`, `wifi_store.*`.

## Soil calibration

`SOIL_RAW_DRY` / `SOIL_RAW_WET` in `config.h` **must stay in sync** with `backend/src/services/telemetry.ts` (and `backend/.env` `SOIL_RAW_DRY`/`SOIL_RAW_WET`), or the dashboard % won't match the pump trigger point.

## Build & flash

```bash
pip install platformio           # once
cd hardware/esp32-firmware        # or esp32-cam-firmware
pio run                           # build
pio run -t upload                 # flash over USB
pio device monitor -b 115200      # serial monitor
```

PlatformIO auto-detects the serial port; set `upload_port`/`monitor_port` only if you have multiple devices.

## platformio.ini (sensor board, abridged)

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
board_build.partitions = default_8MB.csv
board_upload.flash_size = 8MB
framework = arduino
monitor_speed = 115200
build_flags = -D MQTT_MAX_PACKET_SIZE=2048
lib_deps =
  adafruit/Adafruit BME280 Library
  adafruit/Adafruit BMP280 Library
  adafruit/Adafruit Unified Sensor
  adafruit/Adafruit ADS1X15
  knolleary/PubSubClient
  bblanchon/ArduinoJson@^7.0.0
```

## Development tips

- `MQTT_MAX_PACKET_SIZE=2048` is required — IoT Hub twin payloads exceed the PubSubClient default.
- Use `pio device monitor` for Serial logs (sensor reads, MQTT state) at 115200 baud.
- If BME280 init fails, check I2C pull-ups (4.7 kΩ to 3.3 V).
- No OTA — flashing requires a USB connection.
- Never commit `secrets.h` (it's git-ignored via `**/secrets.h`).
