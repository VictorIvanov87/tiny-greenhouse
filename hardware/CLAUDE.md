# CLAUDE.md — Hardware / Firmware

Two ESP32 boards running PlatformIO + Arduino framework. Both send data to the backend REST API over Wi-Fi.

## Board overview

| Directory | Board | Role |
|-----------|-------|------|
| `esp32-firmware/` | ESP32 DevKit | Reads sensors every 5 min → POST `/api/telemetry` |
| `esp32-cam-firmware/` | ESP32-CAM | Captures JPEG snapshot every 1 h → POST `/api/camera/upload` |

## ESP32-Main (sensor telemetry)

**Sensors:**
- **BME280** (Adafruit library) — temperature °C, humidity %, pressure hPa — I2C
- **BH1750FVI** — ambient light lux — I2C at address `0x23`

**Payload sent to `/api/telemetry`:**
```json
{
  "device_id": "esp32-main-01",
  "uptime_ms": 12345678,
  "temperature_c": 24.5,
  "humidity_pct": 65.2,
  "pressure_hpa": 1013.0,
  "light_lux": 300.0,
  "soil_moisture_raw": 1850
}
```

**Key source functions** (`src/main.cpp`):
- `initBme280()` / `initBh1750()` — sensor init with Serial error reporting
- `readLightLux()` — manual 2-byte I2C read
- `connectWifi()` / `ensureWifiConnected()` — reconnect on drop
- `buildTelemetryJson()` — constructs the JSON payload
- `READ_INTERVAL_MS` — set to 5 minutes (300 000 ms)

## ESP32-CAM (camera / timelapse)

**Camera:** OV2640, VGA resolution, JPEG quality 8, auto-WB/AE/AGC enabled.

**Headers sent with the upload:**
```
Content-Type: image/jpeg
X-Device-Id: esp32-cam-01
X-Uptime-Ms: <uptime in ms>
```

**GPIO pin mapping** (`esp32-cam-firmware/src/main.cpp`):
Camera data (D0–D7), XCLK, PCLK, VSYNC, HREF, I2C SDA/SCL, power pin — all defined in `camera_config.pin_*` constants at the top of the file.

## Build & flash

```bash
# Install PlatformIO CLI (once)
pip install platformio

# Build
cd hardware/esp32-firmware
pio run

# Flash
pio run -t upload

# Serial monitor
pio device monitor -b 115200
```

Same commands apply for `esp32-cam-firmware/`.

## Configuration before flashing

Both firmwares have hardcoded Wi-Fi and backend URL constants near the top of `src/main.cpp`. Update these before building:

```cpp
const char* WIFI_SSID     = "your-ssid";
const char* WIFI_PASSWORD = "your-password";
const char* BACKEND_URL   = "http://192.168.x.x:3000";
```

Do not commit real credentials — add a `secrets.h` pattern if needed.

## platformio.ini

```ini
[env:esp32dev]
platform  = espressif32
board     = esp32dev
framework = arduino
monitor_speed = 115200
```

## Wiring reference

See `Wiring (Power & Signal).png` in the `hardware/` root for the full schematic. Summary:
- BME280 + BH1750 share I2C bus (SDA/SCL)
- Soil moisture sensor is analog input
- ESP32-CAM is self-contained (camera pins are internal to the module)

## Development tips

- Use `pio device monitor` to read Serial output — all sensor reads and HTTP responses are logged at 115200 baud
- If BME280 init fails, check I2C pull-ups (4.7 kΩ to 3.3 V)
- OTA updates are not implemented yet — must physically connect USB for each flash
