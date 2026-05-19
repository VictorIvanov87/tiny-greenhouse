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

void connectWifi();
void ensureWifiConnected();

void initTime();

// Wall-clock epoch in ms; returns 0 until NTP has produced a sane value.
uint64_t nowEpochMs();

void connectMqtt();
void ensureMqttConnected();
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
