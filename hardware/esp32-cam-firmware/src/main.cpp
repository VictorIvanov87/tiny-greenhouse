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
  mqttClient.setBufferSize(2048);
  mqttClient.setCallback(mqttCallback);

  connectMqtt();
}

void loop() {
  ensureWifiConnected();
  ensureMqttConnected();
  mqttClient.loop();
  runQueuedCommand();
  delay(50);
}
