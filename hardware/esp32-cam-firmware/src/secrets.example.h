#pragma once

// Copy this file to secrets.h and fill in your values.
// Do NOT commit secrets.h — it is gitignored.

// Wi-Fi
#define WIFI_SSID "your-ssid"
#define WIFI_PASSWORD "your-password"

// Backend API base URL (no trailing slash). Capture commands sent down from
// the backend twin contain a relative `uploadUrl` (e.g. /api/camera/upload or
// /api/camera/test-upload?requestId=...) which the cam appends to this base.
#define BACKEND_URL "https://your-app.azurewebsites.net"

// Local-time rule for NTP (POSIX TZ string). Used so the cam can log capture
// times in the greenhouse-local timezone.
//   "UTC0"                              — UTC
//   "EET-2EEST,M3.5.0/3,M10.5.0/4"      — Sofia / Eastern European
#define TZ_RULE "UTC0"

// Device identity. Must match BOTH:
//   - the device registered with the backend via POST /api/devices
//   - the Azure IoT Hub device identity for this camera
#define CAM_DEVICE_ID "esp32-cam-1"
#define IOT_HUB_DEVICE_ID "esp32-cam-1"

// Azure IoT Hub MQTT.
// IOT_HUB_HOST            = your IoT Hub hostname (Azure Portal → IoT Hub →
//                           Overview → "Hostname")
// IOT_HUB_MQTT_USERNAME   = "<host>/<deviceId>/?api-version=2021-04-12"
// IOT_HUB_MQTT_PASSWORD   = SAS token for this device, full string starting
//                           with "SharedAccessSignature sr=...&sig=...&se=..."
//                           Generate via Azure CLI:
//                             az iot hub generate-sas-token \
//                               --hub-name <your-hub> \
//                               --device-id esp32-cam-1 \
//                               --duration 31536000
//                           or via the VS Code "Azure IoT Hub" extension:
//                             right-click the device → Generate SAS Token.
#define IOT_HUB_HOST "your-iot-hub.azure-devices.net"
#define IOT_HUB_MQTT_USERNAME "your-iot-hub.azure-devices.net/esp32-cam-1/?api-version=2021-04-12"
#define IOT_HUB_MQTT_PASSWORD "SharedAccessSignature sr=...&sig=...&se=..."
