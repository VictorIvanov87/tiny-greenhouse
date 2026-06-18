#include <Arduino.h>

#include "camera_control.h"
#include "net.h"
#include "secrets.h"

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("ESP32-CAM (twin-driven) starting...");

  if (!initCamera()) {
    Serial.println("Camera init failed — halting");
    while (true) delay(1000);
  }
  Serial.println("Camera init OK");

  connectWifi();
  initTime();

  // TLS: skip cert verification (personal project).
  wifiClient.setInsecure();
  // Capturing + uploading a full-resolution JPEG blocks the loop (and therefore
  // mqttClient.loop()) for several seconds. With the 15s PubSubClient default,
  // IoT Hub would drop the MQTT session mid-upload and the cam would stop
  // receiving capture commands until a reboot. A long keepalive lets a single
  // blocking upload finish without tripping it.
  mqttClient.setKeepAlive(120);
  // Bound a stalled TLS handshake so a wedged reconnect can't hang capture forever.
  wifiClient.setHandshakeTimeout(15);
  mqttClient.setBufferSize(2048);
  mqttClient.setCallback(mqttCallback);

  connectMqtt();
}

void loop() {
  ensureWifiConnected();
  ensureMqttConnected();
  mqttClient.loop();
  maybeResyncTwin();
  runQueuedCommand();
  delay(50);
}
