#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

extern WiFiClientSecure wifiClient;
extern PubSubClient mqttClient;
extern bool ntpSynced;
extern const char* DEVICE_ID;

// IoT Hub D2C topics — defined in net.cpp
extern const char* TELEMETRY_TOPIC;
extern const char* STATUS_TOPIC;

// Boot-time Wi-Fi bring-up: loads stored credentials (falling back to the
// compiled secrets.h defaults), connects, and runs the trial/promote/revert
// cycle when this boot is trialing newly-pushed credentials. Replaces the old
// connectWifi() call in setup().
void bringUpWifi();
void ensureWifiConnected();

// Apply a `wifi` twin desired object. If the credentials are genuinely new,
// publishes an "applying" report and schedules a reboot to trial them.
void applyWifiCreds(uint32_t version, const char* ssid, const char* password);

// Publish current Wi-Fi state (SSID, applied version, status, RSSI) to the
// twin's reported properties. No-op when MQTT is disconnected.
void publishWifiReport();

// Perform a scheduled Wi-Fi reboot once the "applying" report has flushed.
// Call from loop().
void maybeWifiReboot();

void initTime();

// Wall-clock epoch in ms; returns 0 until NTP has produced a sane value.
uint64_t nowEpochMs();

void connectMqtt();
void ensureMqttConnected();
void maybeResyncTwin();
void mqttCallback(char* topic, byte* payload, unsigned int length);

// Publish the firmware's current interpretation of a device override to the
// twin's reported properties so it can be inspected from Azure Portal without
// a serial monitor. Label is one of "lights" / "fan" / "pump". No-op when
// MQTT is disconnected.
struct DeviceOverride;
void publishOverrideReport(const char* label, const DeviceOverride& slot);

// Diagnostics
const char* mqttStateName(int state);
void printTlsLastError();
void printConnectionDiagnostics();
