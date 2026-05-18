#include "camera_control.h"

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <string.h>

#include "net.h"
#include "secrets.h"

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

CameraSettings cameraSettings;

// Queued one-shot command. Cleared after execution or expiry.
struct QueuedCommand {
  bool valid = false;
  char type[24] = {0};            // "test_capture" | "timelapse_capture"
  char requestId[40] = {0};
  char uploadUrl[256] = {0};
  uint64_t expiresAtMs = 0;
};

static QueuedCommand queuedCmd;
static char lastExecutedRequestId[40] = {0};

static framesize_t parseFramesize(const char* s) {
  if (!s) return FRAMESIZE_UXGA;
  if (strcmp(s, "UXGA") == 0) return FRAMESIZE_UXGA;
  if (strcmp(s, "SXGA") == 0) return FRAMESIZE_SXGA;
  if (strcmp(s, "XGA")  == 0) return FRAMESIZE_XGA;
  if (strcmp(s, "SVGA") == 0) return FRAMESIZE_SVGA;
  if (strcmp(s, "VGA")  == 0) return FRAMESIZE_VGA;
  return FRAMESIZE_UXGA;
}

static void buildCameraConfig(camera_config_t& config) {
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = cameraSettings.framesize;
  config.jpeg_quality = cameraSettings.jpegQuality;
  config.fb_count = 2;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
}

// Push the in-RAM `cameraSettings` to the live sensor. Safe to call repeatedly.
static void applyCameraSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) return;
  s->set_framesize(s, cameraSettings.framesize);
  s->set_quality(s, cameraSettings.jpegQuality);
  s->set_brightness(s, cameraSettings.brightness);
  s->set_contrast(s, cameraSettings.contrast);
  s->set_saturation(s, cameraSettings.saturation);
  s->set_sharpness(s, cameraSettings.sharpness);
  s->set_denoise(s, cameraSettings.denoise);
  s->set_whitebal(s, cameraSettings.whitebal);
  s->set_awb_gain(s, cameraSettings.awbGain);
  s->set_exposure_ctrl(s, cameraSettings.exposureCtrl);
  s->set_gain_ctrl(s, cameraSettings.gainCtrl);
  s->set_special_effect(s, cameraSettings.specialEffect);
  s->set_wb_mode(s, cameraSettings.wbMode);

  Serial.printf("Camera v%u applied: framesize=%d quality=%u br=%d co=%d sa=%d sh=%d\n",
    cameraSettings.version, (int)cameraSettings.framesize, cameraSettings.jpegQuality,
    cameraSettings.brightness, cameraSettings.contrast, cameraSettings.saturation,
    cameraSettings.sharpness);
}

bool initCamera() {
  camera_config_t config;
  buildCameraConfig(config);
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("esp_camera_init failed: 0x%x\n", err);
    return false;
  }
  applyCameraSensor();
  return true;
}

static void applyCameraSettingsFromTwin(JsonObjectConst obj) {
  if (obj.isNull()) return;

  uint32_t newVersion = obj["version"] | cameraSettings.version;

  cameraSettings.brightness    = obj["brightness"]    | cameraSettings.brightness;
  cameraSettings.contrast      = obj["contrast"]      | cameraSettings.contrast;
  cameraSettings.saturation    = obj["saturation"]    | cameraSettings.saturation;
  cameraSettings.sharpness     = obj["sharpness"]     | cameraSettings.sharpness;
  cameraSettings.denoise       = obj["denoise"]       | cameraSettings.denoise;
  cameraSettings.whitebal      = obj["whitebal"]      | cameraSettings.whitebal;
  cameraSettings.awbGain       = obj["awbGain"]       | cameraSettings.awbGain;
  cameraSettings.exposureCtrl  = obj["exposureCtrl"]  | cameraSettings.exposureCtrl;
  cameraSettings.gainCtrl      = obj["gainCtrl"]      | cameraSettings.gainCtrl;
  cameraSettings.specialEffect = obj["specialEffect"] | cameraSettings.specialEffect;
  cameraSettings.wbMode        = obj["wbMode"]        | cameraSettings.wbMode;
  cameraSettings.jpegQuality   = obj["jpegQuality"]   | cameraSettings.jpegQuality;

  framesize_t prevFs = cameraSettings.framesize;
  const char* fsStr = obj["framesize"] | "";
  if (fsStr[0] != '\0') {
    cameraSettings.framesize = parseFramesize(fsStr);
  }

  cameraSettings.version = newVersion;

  if (prevFs != cameraSettings.framesize) {
    // Frame buffer size changes; safest is full re-init.
    Serial.println("Camera framesize changed — reinitialising");
    esp_camera_deinit();
    if (!initCamera()) {
      Serial.println("Camera re-init failed after framesize change");
    }
    return;
  }

  applyCameraSensor();
}

static void queueCommandFromTwin(JsonObjectConst cmd) {
  if (cmd.isNull()) return;

  const char* type = cmd["type"] | "";
  const char* requestId = cmd["requestId"] | "";
  const char* uploadUrl = cmd["uploadUrl"] | "";
  uint64_t expiresAtMs = cmd["expiresAtMs"] | (uint64_t)0;

  if (type[0] == '\0' || requestId[0] == '\0' || uploadUrl[0] == '\0' || expiresAtMs == 0) {
    return;
  }

  if (strncmp(requestId, lastExecutedRequestId, sizeof(lastExecutedRequestId)) == 0) {
    Serial.printf("Command %s already executed, ignoring replay\n", requestId);
    return;
  }

  // NTP guard: don't honour an unbounded expiry if the clock isn't synced.
  uint64_t now = nowEpochMs();
  if (now == 0 || now >= expiresAtMs) {
    Serial.printf("Command %s expired or clock not synced (now=%llu expires=%llu)\n",
      requestId, (unsigned long long)now, (unsigned long long)expiresAtMs);
    return;
  }

  queuedCmd.valid = true;
  strncpy(queuedCmd.type, type, sizeof(queuedCmd.type) - 1);
  queuedCmd.type[sizeof(queuedCmd.type) - 1] = '\0';
  strncpy(queuedCmd.requestId, requestId, sizeof(queuedCmd.requestId) - 1);
  queuedCmd.requestId[sizeof(queuedCmd.requestId) - 1] = '\0';
  strncpy(queuedCmd.uploadUrl, uploadUrl, sizeof(queuedCmd.uploadUrl) - 1);
  queuedCmd.uploadUrl[sizeof(queuedCmd.uploadUrl) - 1] = '\0';
  queuedCmd.expiresAtMs = expiresAtMs;

  Serial.printf("Command queued: type=%s requestId=%s\n", queuedCmd.type, queuedCmd.requestId);
}

void applyCameraTwin(JsonObjectConst obj) {
  if (obj.isNull()) return;

  JsonObjectConst cs = obj["cameraSettings"];
  if (!cs.isNull()) applyCameraSettingsFromTwin(cs);

  // timelapse hour is informational on the cam — the backend orchestrates
  // when to actually capture; we keep the fields here for future use / debug.
  if (!obj["timelapseHourUtc"].isNull() || !obj["timelapseEnabled"].isNull()) {
    Serial.printf("Timelapse twin: enabled=%d hourUtc=%d\n",
      (int)(obj["timelapseEnabled"] | false),
      (int)(obj["timelapseHourUtc"] | -1));
  }

  JsonObjectConst cmd = obj["command"];
  if (!cmd.isNull()) queueCommandFromTwin(cmd);
}

static bool postJpeg(const char* fullUrl, const uint8_t* buf, size_t len, const char* requestId) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, fullUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("x-device-id", DEVICE_ID);
  http.addHeader("x-uptime-ms", String(millis()));
  if (requestId && requestId[0] != '\0') {
    http.addHeader("x-request-id", requestId);
  }

  int httpCode = http.POST(const_cast<uint8_t*>(buf), len);
  bool ok = false;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("Upload HTTP %d: %s\n", httpCode, response.c_str());
    ok = (httpCode >= 200 && httpCode < 300);
  } else {
    Serial.printf("Upload failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
  return ok;
}

void runQueuedCommand() {
  if (!queuedCmd.valid) return;

  // Re-check expiry; the command may have aged out while we were busy.
  uint64_t now = nowEpochMs();
  if (now == 0 || now >= queuedCmd.expiresAtMs) {
    Serial.printf("Command %s expired before execution\n", queuedCmd.requestId);
    queuedCmd.valid = false;
    return;
  }

  Serial.printf("Executing command: type=%s requestId=%s\n",
    queuedCmd.type, queuedCmd.requestId);

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Capture failed");
    queuedCmd.valid = false;
    return;
  }

  // The first frame buffer after a settings change can be stale — discard one
  // and capture a fresh frame so the test image reflects the latest settings.
  esp_camera_fb_return(fb);
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Capture failed on second attempt");
    queuedCmd.valid = false;
    return;
  }

  Serial.printf("Captured %u bytes\n", fb->len);

  // Resolve relative uploadUrl against BACKEND_URL.
  String fullUrl;
  if (strncmp(queuedCmd.uploadUrl, "http", 4) == 0) {
    fullUrl = queuedCmd.uploadUrl;
  } else {
    fullUrl = String(BACKEND_URL) + queuedCmd.uploadUrl;
  }

  bool ok = postJpeg(fullUrl.c_str(), fb->buf, fb->len, queuedCmd.requestId);
  esp_camera_fb_return(fb);

  if (ok) {
    strncpy(lastExecutedRequestId, queuedCmd.requestId, sizeof(lastExecutedRequestId) - 1);
    lastExecutedRequestId[sizeof(lastExecutedRequestId) - 1] = '\0';
    Serial.printf("Command %s OK\n", queuedCmd.requestId);
  } else {
    Serial.printf("Command %s upload failed\n", queuedCmd.requestId);
  }

  queuedCmd.valid = false;
}
