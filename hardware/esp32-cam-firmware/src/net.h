#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

extern WiFiClientSecure wifiClient;
extern PubSubClient mqttClient;
extern bool ntpSynced;
extern const char* DEVICE_ID;

void connectWifi();
void ensureWifiConnected();

void initTime();
uint64_t nowEpochMs();

void connectMqtt();
void ensureMqttConnected();
void mqttCallback(char* topic, byte* payload, unsigned int length);
