# tiny-greenhouse

**An autonomous home mini-greenhouse with a web interface**

## Overview

_tiny-greenhouse_ is an educational project that combines web engineering, ready-made computer vision, and (later) IoT control to maintain a small indoor growing environment. The goal is a compact, winter-friendly setup that monitors conditions, explains its own decisions, and produces clear visual evidence of plant growth (timelapse).

This repository starts with the **coursework scope** (architecture + frontend + mock backend + CV integration). The **thesis stage** will add real sensors/actuators and control logic on microcontrollers.

## Problem & Idea

Indoor growing in small spaces is noisy and error-prone: inconsistent light/irrigation, no historical context, and hard-to-interpret sensor data. The project aims to:

-   **Monitor** temperature, humidity and substrate moisture, and collect timelapse images.
-   **Decide** simple actions via rules (e.g., light hours, irrigation pulses).
-   **Explain** decisions in natural language (LLM) using measured metrics and explicit rules.
-   **Demonstrate** improvements with graphs and side-by-side timelapse evidence.

## Coursework MVP (this repo)

-   **Web dashboard (React SPA):** live (simulated) telemetry charts, timelapse viewer, modes (seedling/growth), and basic alerts.
-   **Ready-made CV metric:** extract a simple signal from images (e.g., green-area ratio) via a pre-trained model/service; no custom training.
-   **LLM explanations:** short, template-guided summaries that translate metrics/rules into human-readable guidance.
-   **Data contracts:** JSON Schema for telemetry and an OpenAPI draft for the backend.
-   **Security basics:** JWT (admin/viewer), security headers.

## Thesis

-   **IoT prototype:** ESP32 firmware for sensors (e.g., SHT31, soil moisture) and relays (light, pump, fan/humidifier), publishing via MQTT/HTTPS.
-   **Control loops:** from hysteresis rules to tuned intervals; optional PID for humidity/soil moisture.
-   **Reliability & security:** device auth/TLS, signed configs/updates (if used), segmented network.
-   **Experiments:** compare modes/lighting/irrigation and quantify stability, growth rate, and resource use.

## Architecture (high level)

-   **Frontend (React SPA):** dashboard, alerts, timelapse, settings.
-   **Backend (Node):** REST/WebSocket API, image handling, CV/LLM integrations, simple storage.
-   **IoT (thesis):** ESP32 + sensors/relays → MQTT/HTTPS → backend; camera uploads frames on a schedule.

## Tech Stack (initial)

-   **Frontend:** React + Vite, React Router, React Query, Recharts.
-   **Backend:** Node.js (Fastify/Express), OpenAPI spec, JSON Schema validation.
-   **CV & AI:** ready-made model/service for image metrics; LLM for concise explanations.
-   **IoT (later):** ESP32, MQTT (Mosquitto), common I²C sensors; simple relays.

## Repository Layout

```
data/       # sample telemetry and timelapse frames for development
docs/       # ADRs, diagrams, design notes
hardware/   # schematics, wiring, BOM (thesis stage)
frontend/   # React SPA (dashboard, timelapse, alerts, settings)
backend/    # Node API (mock now; device API later)
```

## Getting Started (dev)

```bash
# Frontend
cd frontend && npm i && npm run dev

# Backend (mock)
cd backend && npm i && npm run dev
# Frontend dev server should proxy /api → backend; adjust .env/proxy as needed.
```

## Roadmap

-   Coursework: architecture, SPA, mock API, CV metric, LLM explanations, demo package.
-   Thesis: IoT prototype, control logic, hardening, experiments, final write-up & live demo.

## License

TBD
