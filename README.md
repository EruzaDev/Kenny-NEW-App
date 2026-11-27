# Kenny Nav — SLAM Map & Goal Sync App

Mobile-first web & Android (Capacitor) app with a real-time sync API for syncing with **Kenny's saved SLAM map**, landing a pinpoint where you are (or anywhere on the map), sending it to the API, echoing the confirmed goal back to your device, and having Kenny navigate to the set goal.

## Features

- **Interactive 2D SLAM Map** — Renders Kenny's saved occupancy grid map (rooms, walls, obstacles, 1m metric grid, live robot footprint with lidar cone, your position marker, and animated planned path). Supports pinch-to-zoom, pan/zoom, and uploading custom saved map images.
- **Tap-to-Pinpoint & Heading Control** — Tap anywhere on the map or tap **Where I Am** to land a pinpoint with spring drop + sonar ripple animations, adjust arrival heading (`yaw`), and send it as Kenny's active navigation goal.
- **Two-Way API Sync (REST + SSE)** — `POST /api/goal` computes an obstacle-aware A* path on the saved map and immediately broadcasts the confirmed goal back to your device via Server-Sent Events (`GET /api/events`), streaming Kenny's live pose & progress until arrival.
- **Offline Mode & Connection Indicator** — Works seamlessly offline using local storage (`src/lib/offlineStore.ts`) with a live online/offline status indicator in the top bar; queues/simulates goals locally when disconnected from the Kenny API server.
- **Liquid Glass Emerald UI + Dark Mode** — Mobile-first docked bottom sheet with liquid glass styling, high-contrast light and dark emerald palettes, and smooth Framer Motion micro-interactions (respects `prefers-reduced-motion`).
- **Saved Waypoints & Custom API Endpoint** — Quick-tap saved locations, save new custom waypoints, inspect the live API sync log, or point the UI to a remote Kenny API URL.
- **Android APK Support (Capacitor)** — Bundled Capacitor Android project (`android/`), prebuilt debug APK (`apk/app-debug.apk`), and GitHub Actions CI workflow (`.github/workflows/build-apk.yml`).

## Prerequisites

- **Node.js** 22+ and **npm**
- For local Android APK builds:
  - **Java 21** (Temurin / OpenJDK 21)
  - **Android SDK** (`ANDROID_HOME` / `ANDROID_SDK_ROOT` configured)

## Quick Start (Web & Sync API)

```bash
npm install
npm run dev
```

- **Web App:** `http://localhost:5173` (accessible on your phone over LAN via `--host`)
- **Sync API Server:** `http://localhost:3001/api`

Other npm scripts:

```bash
npm run dev:api       # Run only the Express sync API server
npm run dev:web       # Run only the Vite web dev server
npm run build         # Type-check and build production web bundle into dist/
npm run preview       # Preview the production build over LAN
npm run android:sync  # Build web bundle and sync assets into android/
```

## Android App Setup & APK Build

### Option 1: Install the Prebuilt Debug APK
A debug APK is included at [`apk/app-debug.apk`](apk/app-debug.apk). Transfer it to an Android device (or install via `adb install apk/app-debug.apk`) and allow installation from unknown sources.

### Option 2: Build the APK Locally
```bash
npm install
npm run android:sync
cd android
chmod +x gradlew
./gradlew assembleDebug
```
The compiled APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Option 3: GitHub Actions CI Build
Every push to `main` (or manual `workflow_dispatch`) triggers [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml), which builds the web bundle, syncs Capacitor, compiles the debug APK, and uploads it as the `Kenny-Nav-APK` artifact (30-day retention).

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and connected client count |
| `GET` | `/api/map` | Fetch Kenny's saved SLAM map metadata & geometry |
| `POST` | `/api/map` | Upload/sync a custom saved map image & dimensions |
| `GET` | `/api/state` | Fetch Kenny's live pose, active goal, path, waypoints, and sync log |
| `POST` | `/api/goal` | Land a pinpoint goal (`{ x, y, yaw, label, deviceId }`) and broadcast it back |
| `DELETE` | `/api/goal` | Cancel Kenny's current navigation goal |
| `GET` | `/api/events` | Real-time SSE stream pushing goal sync confirmations & live robot pose |
