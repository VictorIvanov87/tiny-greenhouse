#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "esp_camera.h"

struct CameraSettings {
  uint32_t version = 1;
  int8_t brightness = 0;
  int8_t contrast = 1;
  int8_t saturation = 0;
  int8_t sharpness = 2;
  uint8_t denoise = 1;
  uint8_t whitebal = 1;
  uint8_t awbGain = 1;
  uint8_t exposureCtrl = 1;
  uint8_t gainCtrl = 1;
  uint8_t specialEffect = 0;
  uint8_t wbMode = 0;
  framesize_t framesize = FRAMESIZE_UXGA;
  uint8_t jpegQuality = 4;
};

extern CameraSettings cameraSettings;

// Initialise the OV2640 with the values currently in `cameraSettings`.
bool initCamera();

// Apply incoming twin desired-properties object.
// Recognised keys: `cameraSettings`, `timelapseEnabled`, `timelapseHourUtc`,
// `command`.
void applyCameraTwin(JsonObjectConst obj);

// Called every loop iteration. If a command is queued and not expired,
// captures one frame and POSTs it to the upload URL.
void runQueuedCommand();
