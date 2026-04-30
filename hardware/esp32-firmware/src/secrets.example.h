#pragma once

// Copy this file to secrets.h and fill in your values.
// Do NOT commit secrets.h — it is gitignored.

// Wi-Fi
#define WIFI_SSID "your-ssid"
#define WIFI_PASSWORD "your-password"

// Azure IoT Hub
// Generate a SAS token via: az iot hub generate-sas-token -n <hub> -d <device> --du 31536000
#define IOT_HUB_HOST "your-hub.azure-devices.net"
#define IOT_HUB_DEVICE_ID "esp32-main-1"
#define IOT_HUB_MQTT_USERNAME "your-hub.azure-devices.net/esp32-main-1/?api-version=2021-04-12"
#define IOT_HUB_MQTT_PASSWORD "SharedAccessSignature sr=...&sig=...&se=..."
