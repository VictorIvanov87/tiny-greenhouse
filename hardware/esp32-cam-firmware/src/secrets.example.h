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

// Local-time rule for NTP. Used so the cam can log capture times in the
// greenhouse-local timezone. Example: "EET-2EEST,M3.5.0/3,M10.5.0/4" (Sofia).
#define TZ_RULE "UTC0"

// Device registration — must match the device registered via POST /api/devices
// and the Azure IoT Hub device identity created for this camera.
#define CAM_DEVICE_ID "esp32-cam-1"
#define IOT_HUB_DEVICE_ID "esp32-cam-1"

// Azure IoT Hub MQTT credentials. Create the device in IoT Hub, then generate
// a SAS token for it (use Azure CLI: `az iot hub generate-sas-token`).
#define IOT_HUB_HOST "your-iot-hub.azure-devices.net"
#define IOT_HUB_MQTT_USERNAME "your-iot-hub.azure-devices.net/esp32-cam-1/?api-version=2021-04-12"
#define IOT_HUB_MQTT_PASSWORD "SharedAccessSignature sr=...&sig=...&se=..."
