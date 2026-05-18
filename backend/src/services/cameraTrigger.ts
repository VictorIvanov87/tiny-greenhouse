import { randomUUID } from 'node:crypto';
import { updateDeviceTwinDesired } from '../lib/iothub';
import { listDevicesForUser } from './devices';
import { registerPending, type CaptureKind } from './cameraTestStore';

const LIGHTS_OFF_DURATION_SEC = 25;     // Override window on the main controller.
const LIGHTS_OFF_TO_CAPTURE_DELAY_MS = 10_000;
const COMMAND_VALIDITY_MS = 60_000;

export type TriggerCaptureOptions = {
  ownerId: string;
  camDeviceId: string;
  kind: CaptureKind;
  uploadPath: string;            // relative to the backend, e.g. /api/camera/test-upload or /api/camera/upload
  lightsOff?: boolean;
  requestId?: string;
};

export type TriggerCaptureResult = {
  requestId: string;
  expiresAt: Date;
  lightsOffApplied: boolean;
  delayMs: number;
};

/**
 * Centralised "ask the cam to take one picture" flow:
 *  1. Optionally push an `overrides.lights = off` patch to the user's main
 *     controller so the pink/purple grow lights don't bleed into the frame.
 *  2. Wait briefly so the lights physically settle (asynchronous; we don't
 *     block the caller — the wait is folded into the cam's command validity).
 *  3. Push a one-shot `command` patch to the cam twin. The cam dedupes via
 *     requestId and ignores expired commands on reboot.
 *
 * Returns synchronously after the twin patches are queued. The cam executes
 * the capture when it next sees the patch (typically within seconds).
 */
export const triggerCapture = async (
  opts: TriggerCaptureOptions,
): Promise<TriggerCaptureResult> => {
  const requestId = opts.requestId ?? randomUUID();
  const now = Date.now();
  const expiresAtMs = now + COMMAND_VALIDITY_MS;
  const expiresAt = new Date(expiresAtMs);

  registerPending({
    requestId,
    deviceId: opts.camDeviceId,
    ownerId: opts.ownerId,
    type: opts.kind,
    createdAt: now,
    expiresAt: expiresAtMs,
  });

  let lightsOffApplied = false;
  if (opts.lightsOff !== false) {
    const devices = await listDevicesForUser(opts.ownerId);
    const main = devices.find((d) => d.type === 'esp32-main');
    if (main) {
      try {
        await updateDeviceTwinDesired(main.deviceId, {
          overrides: {
            lights: {
              state: 'off',
              expiresAtMs: now + LIGHTS_OFF_DURATION_SEC * 1000,
            },
          },
        });
        lightsOffApplied = true;
      } catch {
        // Non-fatal: still take the picture, just with the lights on.
        lightsOffApplied = false;
      }
    }
  }

  const uploadUrl = opts.uploadPath.includes('?')
    ? `${opts.uploadPath}&requestId=${encodeURIComponent(requestId)}`
    : `${opts.uploadPath}?requestId=${encodeURIComponent(requestId)}`;

  await updateDeviceTwinDesired(opts.camDeviceId, {
    command: {
      type: opts.kind,
      requestId,
      uploadUrl,
      expiresAtMs,
    },
  });

  return {
    requestId,
    expiresAt,
    lightsOffApplied,
    delayMs: lightsOffApplied ? LIGHTS_OFF_TO_CAPTURE_DELAY_MS : 0,
  };
};
