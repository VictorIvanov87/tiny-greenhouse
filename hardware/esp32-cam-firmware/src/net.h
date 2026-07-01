#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

extern WiFiClientSecure wifiClient;
extern PubSubClient mqttClient;
extern const char* DEVICE_ID;

// Boot-time Wi-Fi bring-up: loads stored credentials (falling back to the
// compiled secrets.h defaults), connects, and runs the trial/promote/revert
// cycle when this boot is trialing newly-pushed credentials.
void bringUpWifi();
void ensureWifiConnected();

// Apply a `wifi` twin desired object. If the credentials are genuinely new,
// publishes an "applying" report and schedules a reboot to trial them.
void applyWifiCreds(uint32_t version, const char* ssid, const char* password);

// Publish current Wi-Fi state to the twin reported properties. No-op when
// MQTT is disconnected.
void publishWifiReport();

// Perform a scheduled Wi-Fi reboot once the "applying" report has flushed.
void maybeWifiReboot();

void initTime();
uint64_t nowEpochMs();

void connectMqtt();
void ensureMqttConnected();
void maybeResyncTwin();
void mqttCallback(char* topic, byte* payload, unsigned int length);
