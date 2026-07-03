# Tiny Greenhouse — Firmware

Two ESP32 boards running PlatformIO + the Arduino framework. Both connect over Wi-Fi and communicate with **Azure IoT Hub over MQTT (TLS, port 8883)** using device twins. This is the IoT layer of the [Tiny Greenhouse](../README.md) system.

| Directory | Board | Role |
|-----------|-------|------|
| [`esp32-firmware/`](esp32-firmware/) | ESP32 DevKit (8 MB) | Reads sensors, drives actuators, publishes telemetry every 5 min |
| [`esp32-cam-firmware/`](esp32-cam-firmware/) | ESP32-CAM (AI-Thinker) | Captures JPEG snapshots on command and uploads them to the backend |

> **Note:** earlier drafts of the docs described a plain HTTP-POST design. The firmware now
> uses **MQTT → Azure IoT Hub with device twins**. Sensor telemetry is published as MQTT
> messages; only the camera still does an HTTP upload of the JPEG image itself (to a URL the
> backend hands it via the twin).

## Sensor board (`esp32-firmware`)

**Sensors** (all on the shared I2C bus, SDA `GPIO21` / SCL `GPIO22`):
- **BME280** — temperature, humidity, pressure (auto-falls back to **BMP280**, no humidity, if that chip is detected)
- **BH1750** — ambient light (lux), I2C address `0x23`
- **ADS1115** ADC — up to 4 capacitive **soil-moisture** channels

**Actuators** (GPIO → MOSFET channels): fan `GPIO23`, pump `GPIO19`, grow light `GPIO18`. A float switch on `GPIO27` reports water level. Control rules (light schedule, pump on low soil moisture, fan) live in `src/control.cpp` and run on Bulgaria local time (`TZ_RULE` in `config.h`).

**Source layout** (`esp32-firmware/src/`):

| File | Responsibility |
|------|----------------|
| `main.cpp` | Setup + main loop, watchdog, scheduling |
| `sensors.cpp/.h` | Sensor init, reads, health/staleness detection |
| `control.cpp/.h` | Actuator control rules |
| `telemetry.cpp/.h` | Builds the JSON payload and publishes it to IoT Hub |
| `net.cpp/.h` | Wi-Fi connect + MQTT/TLS client, twin sync |
| `wifi_store.cpp/.h` | Runtime Wi-Fi provisioning stored in NVS (overrides `secrets.h`) |
| `config.h` | Non-secret config: pins, timing, soil calibration, timezone |
| `secrets.example.h` | Template for Wi-Fi + IoT Hub credentials → copy to `secrets.h` |

### Soil-moisture calibration

`SOIL_RAW_DRY` / `SOIL_RAW_WET` in [`config.h`](esp32-firmware/src/config.h) **must match** the backend defaults (`SOIL_RAW_DRY` / `SOIL_RAW_WET` in `backend/.env` and `backend/src/services/telemetry.ts`) so the dashboard percentage equals the value the pump actually triggers on.

## Camera board (`esp32-cam-firmware`)

Captures an OV2640 JPEG on demand. It receives capture commands (and a relative `uploadUrl`) from its device twin, then HTTP-uploads the image to `BACKEND_URL + uploadUrl`. Source: `camera_control.cpp` (capture), `net.cpp` (Wi-Fi/MQTT/upload), `wifi_store.cpp` (provisioning).

## Configuration — secrets

Neither board hardcodes credentials. Copy the template and fill it in (both `secrets.h` files are git-ignored):

```bash
cd hardware/esp32-firmware/src   # and again in esp32-cam-firmware/src
cp secrets.example.h secrets.h
# edit secrets.h: Wi-Fi SSID/password + Azure IoT Hub host, device id, MQTT username, SAS token
```

Wi-Fi can also be provisioned at runtime (stored in NVS via `wifi_store`); the `secrets.h` SSID is the fallback.

### Provisioning an Azure IoT Hub device

1. Create an IoT Hub in the Azure Portal (free F1 tier is enough).
2. Register a device identity per board (e.g. `esp32-main-1`, `esp32-cam-1`).
3. Generate a SAS token for each and paste it into `secrets.h` as `IOT_HUB_MQTT_PASSWORD`:
   ```bash
   az iot hub generate-sas-token --hub-name <your-hub> --device-id esp32-main-1 --duration 31536000
   ```
   `IOT_HUB_MQTT_USERNAME` is `<host>/<deviceId>/?api-version=2021-04-12`.
4. Register the same device id with the backend via `POST /api/devices` so telemetry is attributed to an owner.

The backend consumes hub telemetry via its Event Hub-compatible endpoint (`IOT_HUB_*` in `backend/.env.example`).

## Build & flash

```bash
pip install platformio            # once

cd hardware/esp32-firmware        # or esp32-cam-firmware
pio run                           # build only
pio run -t upload                 # build + flash over USB
pio device monitor -b 115200      # serial monitor
```

> **Serial port:** PlatformIO auto-detects the ESP32's serial port. If you have several USB
> devices attached, set `upload_port` / `monitor_port` in the board's `platformio.ini`, or pass
> `--upload-port <port>` on the CLI.

## Wiring

See [`Wiring (Power & Signal).png`](Wiring%20(Power%20&%20Signal).png) in this folder for the full schematic. Summary: BME280 + BH1750 share the I2C bus; soil sensors go through the ADS1115 ADC; actuators are driven through a MOSFET module; the ESP32-CAM is self-contained.
