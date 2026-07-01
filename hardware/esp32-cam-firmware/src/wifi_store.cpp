#include "wifi_store.h"

#include <Preferences.h>

// NVS namespace + keys. Keys are short (NVS key limit is 15 chars).
static Preferences prefs;

static String defSsid_;
static String defPass_;
static String activeSsid_;
static String activePass_;
static uint32_t appliedVer_ = 0;
static bool inTrial_ = false;
static String pendSsid_;
static String pendPass_;
static uint32_t pendVer_ = 0;

void wifiStoreBegin(const char* defSsid, const char* defPass) {
  defSsid_ = defSsid ? defSsid : "";
  defPass_ = defPass ? defPass : "";

  prefs.begin("wifi", false);  // read/write, persists for process lifetime

  activeSsid_ = prefs.getString("ssid", defSsid_);
  activePass_ = prefs.getString("pass", defPass_);
  appliedVer_ = prefs.getUInt("ver", 0);
  inTrial_ = prefs.getBool("trial", false);
  pendSsid_ = prefs.getString("pnd_ssid", "");
  pendPass_ = prefs.getString("pnd_pass", "");
  pendVer_ = prefs.getUInt("pnd_ver", 0);

  // Defensive: a trial flag with no pending SSID is meaningless (e.g. an
  // interrupted write) — clear it so we boot on the known-good creds.
  if (inTrial_ && pendSsid_.length() == 0) {
    inTrial_ = false;
    prefs.putBool("trial", false);
  }
}

bool wifiStoreInTrial() { return inTrial_; }

WifiCreds wifiStoreConnectCreds() {
  WifiCreds c;
  if (inTrial_) {
    c.ssid = pendSsid_;
    c.password = pendPass_;
  } else {
    c.ssid = activeSsid_;
    c.password = activePass_;
  }
  return c;
}

String wifiStoreActiveSsid() { return activeSsid_; }

uint32_t wifiStoreAppliedVersion() { return appliedVer_; }

bool wifiStoreArmTrial(uint32_t version, const char* ssid, const char* password) {
  if (!ssid) return false;
  String s(ssid);
  String p(password ? password : "");
  if (s.length() == 0) return false;        // ignore an empty SSID
  if (version <= appliedVer_) return false;  // stale / already applied

  if (s == activeSsid_ && p == activePass_) {
    // Same network, newer version — record it so we stop re-arming, no reboot.
    appliedVer_ = version;
    prefs.putUInt("ver", version);
    return false;
  }

  pendSsid_ = s;
  pendPass_ = p;
  pendVer_ = version;
  prefs.putString("pnd_ssid", s);
  prefs.putString("pnd_pass", p);
  prefs.putUInt("pnd_ver", version);
  prefs.putBool("trial", true);
  inTrial_ = true;
  return true;
}

void wifiStorePromote() {
  activeSsid_ = pendSsid_;
  activePass_ = pendPass_;
  appliedVer_ = pendVer_;
  prefs.putString("ssid", activeSsid_);
  prefs.putString("pass", activePass_);
  prefs.putUInt("ver", appliedVer_);
  prefs.putBool("trial", false);
  prefs.remove("pnd_ssid");
  prefs.remove("pnd_pass");
  prefs.remove("pnd_ver");
  inTrial_ = false;
  pendSsid_ = "";
  pendPass_ = "";
}

void wifiStoreRevert() {
  prefs.putBool("trial", false);
  prefs.remove("pnd_ssid");
  prefs.remove("pnd_pass");
  prefs.remove("pnd_ver");
  inTrial_ = false;
  pendSsid_ = "";
  pendPass_ = "";
}
