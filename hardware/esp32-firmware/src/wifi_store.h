#pragma once

#include <Arduino.h>

// NVS-backed Wi-Fi credential store with a safe trial / promote / revert cycle.
//
// The device connects with the "active" (last-known-good) credentials. When the
// backend pushes a new credential set via the twin (desired.wifi), the firmware
// calls wifiStoreArmTrial() to persist it as "pending" and mark the next boot as
// a trial, then reboots. On that boot the caller connects with
// wifiStoreConnectCreds() (which returns the pending creds while a trial is
// armed) and then calls wifiStorePromote() on success or wifiStoreRevert() on
// failure — so wrong credentials can never brick the device as long as the old
// network is still reachable.
//
// Everything is held in RAM after wifiStoreBegin(); NVS is only written on
// arm/promote/revert (rare), so flash wear is a non-issue.

struct WifiCreds {
  String ssid;
  String password;
};

// Load NVS into RAM. `defSsid`/`defPass` are the compiled secrets.h defaults,
// used when nothing has ever been stored (fresh flash). Call once at boot.
void wifiStoreBegin(const char* defSsid, const char* defPass);

// True if this boot is trialing freshly-pushed credentials.
bool wifiStoreInTrial();

// Credentials to connect with this boot: pending creds while a trial is armed,
// otherwise the active creds (falling back to the compiled defaults).
WifiCreds wifiStoreConnectCreds();

// Currently-active SSID (active-or-default) — for reported twin / diagnostics.
String wifiStoreActiveSsid();

// The twin `wifi.version` last successfully applied (0 if never configured).
uint32_t wifiStoreAppliedVersion();

// A new credential set arrived from the twin. Returns true (caller should then
// reboot to trial it) only when the version is newer AND the credentials differ
// from the active ones. Same-credential or stale/older versions are absorbed
// without a reboot.
bool wifiStoreArmTrial(uint32_t version, const char* ssid, const char* password);

// Trial succeeded: promote pending -> active, record the version, clear trial.
void wifiStorePromote();

// Trial failed: discard pending, keep the last-known-good active creds.
void wifiStoreRevert();
