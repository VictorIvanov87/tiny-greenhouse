# Tiny Greenhouse — Camera

The prototype has a single onboard camera, separate from the sensor board.

## Hardware

- ESP32-CAM module with an OV2640 image sensor.
- Mounted inside the enclosure, pointed down/across at the pots.
- White-balance, exposure, and gain are on auto.

## Capture cadence

- One JPEG snapshot **every 1 hour**.
- Default capture resolution is VGA (640×480), JPEG quality 8.
- Uploaded to backend at `/api/camera/upload`. Metadata recorded: `deviceId`, `ownerId`, `greenhouseId`, `capturedAt`, blob URL.

## What the assistant uses the camera for

- The most recent image is automatically made available to the assistant when the user asks gardening-related questions.
- The assistant should:
  - Comment on visible plant state (leaf color, wilting, growth, soil surface) when the user asks "how do my plants look?" or similar.
  - Note when the image is too dark, blurry, or partly obstructed — and ask the user a clarifying question rather than guessing.
  - Treat the image as a single moment in time; for trends, combine it with telemetry history.

## Limits to be honest about

- Single fixed viewpoint — the camera cannot see all leaves or the underside.
- VGA resolution — fine detail (small pests, early leaf spotting) may be invisible.
- Hourly cadence — if something happened in the last hour, the image may predate it.
- No artificial lighting at night — late-evening images may be very dark.

When the latest image is older than a few hours, the assistant should mention the timestamp so the user knows the picture isn't real-time.
