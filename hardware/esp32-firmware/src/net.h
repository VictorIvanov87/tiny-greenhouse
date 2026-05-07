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

void connectMqtt();
void ensureMqttConnected();
void mqttCallback(char* topic, byte* payload, unsigned int length);

// Diagnostics
const char* mqttStateName(int state);
void printTlsLastError();
void printConnectionDiagnostics();
