# Kenny Nav — SLAM Map & Goal Sync App

Mobile-first web app & real-time sync API for syncing with **Kenny's saved SLAM map**, landing a pinpoint where you are (or anywhere on the map), sending it to the API, echoing the confirmed goal back to your device, and having Kenny navigate to the set goal.

## Features

- **Interactive 2D SLAM Map** — Renders Kenny's saved occupancy grid map (rooms, walls, obstacles, 1m metric grid, live robot footprint with lidar cone, your position marker, and animated planned path). Supports pan/zoom and uploading custom saved map images.
- **Tap-to-Pinpoint & Heading Control** — Tap anywhere on the map or tap **Where I Am** to land a pinpoint with spring drop + sonar ripple animations, adjust arrival heading (`yaw`), and send it as Kenny's active navigation goal.
- **Two-Way API Sync (REST + SSE)** — `POST /api/goal` computes an obstacle-aware A* path on the saved map and immediately broadcasts the confirmed goal back to your device via Server-Sent Events (`GET /api/events`), streaming Kenny's live pose & progress until arrival.
- **Emerald Green Theme + Dark Mode** — High-contrast light and dark emerald palettes with smooth animated theme switching and Framer Motion micro-interactions (respects `prefers-reduced-motion`).
- **Saved Waypoints & Custom API Endpoint** — Quick-tap saved locations, save new custom waypoints, inspect the live API sync log, or point the UI to a remote Kenny API URL.

## Quick Start

```bash
npm install
npm run dev
```

- **Web App:** `http://localhost:5173` (accessible on your phone over LAN via `--host`)
- **Sync API Server:** `http://localhost:3001/api`

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
