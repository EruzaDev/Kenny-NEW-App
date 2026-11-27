import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ============================================================================
// Kenny's Saved SLAM Map (16m x 12m indoor occupancy layout, 0.05 m/px ROS spec)
// ============================================================================
let savedMap = {
  id: 'kenny-home-slam-v2',
  name: 'Kenny_Home_Floor1.yaml',
  resolution: 0.05,
  widthMeters: 16,
  heightMeters: 12,
  origin: [0, 0, 0],
  updatedAt: new Date().toISOString(),
  imageDataUrl: null,
  rooms: [
    { id: 'living', name: 'Living Room', x: 0.4, y: 0.4, w: 7.4, h: 6.2 },
    { id: 'kitchen', name: 'Kitchen', x: 8.1, y: 0.4, w: 7.5, h: 5.2 },
    { id: 'hall', name: 'Corridor', x: 0.4, y: 6.9, w: 15.2, h: 1.8 },
    { id: 'studio', name: 'Kenny Lab', x: 0.4, y: 9.0, w: 7.4, h: 2.6 },
    { id: 'bedroom', name: 'Bedroom', x: 8.1, y: 9.0, w: 7.5, h: 2.6 },
  ],
  // Outer walls + interior partitions with doorways
  walls: [
    // Perimeter
    { x: 0, y: 0, w: 16, h: 0.35 },
    { x: 0, y: 11.65, w: 16, h: 0.35 },
    { x: 0, y: 0, w: 0.35, h: 12 },
    { x: 15.65, y: 0, w: 0.35, h: 12 },
    // Living <-> Kitchen wall (with doorway gap y: 3.4..5.2)
    { x: 7.8, y: 0.35, w: 0.3, h: 3.05 },
    { x: 7.8, y: 5.2, w: 0.3, h: 1.7 },
    // Living <-> Corridor wall (doorway x: 3.2..5.0)
    { x: 0.35, y: 6.6, w: 2.85, h: 0.3 },
    { x: 5.0, y: 6.6, w: 3.1, h: 0.3 },
    // Kitchen <-> Corridor wall (doorway x: 10.8..12.8)
    { x: 8.1, y: 5.6, w: 2.7, h: 0.3 },
    { x: 12.8, y: 5.6, w: 2.85, h: 0.3 },
    // Corridor <-> Lab & Bedroom wall (doorways x: 2.2..3.8 and x: 10.6..12.2)
    { x: 0.35, y: 8.7, w: 1.85, h: 0.3 },
    { x: 3.8, y: 8.7, w: 6.8, h: 0.3 },
    { x: 12.2, y: 8.7, w: 3.45, h: 0.3 },
    // Lab <-> Bedroom divider
    { x: 7.8, y: 9.0, w: 0.3, h: 2.65 },
  ],
  obstacles: [
    { x: 1.4, y: 1.4, w: 2.6, h: 1.2, label: 'Sofa' },
    { x: 2.2, y: 3.6, w: 1.8, h: 1.0, label: 'Coffee Table' },
    { x: 10.4, y: 1.6, w: 3.0, h: 1.3, label: 'Island' },
    { x: 1.2, y: 10.1, w: 2.2, h: 1.1, label: 'Workbench' },
    { x: 12.6, y: 9.6, w: 2.3, h: 1.6, label: 'Bed' },
  ],
};

// ============================================================================
// Live Robot State & Sync Log
// ============================================================================
let state = {
  robotName: 'Kenny-01',
  online: true,
  battery: 88,
  status: 'idle',
  pose: { x: 1.6, y: 7.8, yaw: 0 },
  userPose: { x: 5.6, y: 4.3, yaw: -Math.PI / 4 },
  activeGoal: null,
  plannedPath: [],
  progress: 0,
  remainingMeters: 0,
  waypoints: [
    { id: 'wp-dock', name: 'Charging Dock', x: 1.5, y: 7.8, yaw: 0, category: 'dock' },
    { id: 'wp-living', name: 'Living Center', x: 5.4, y: 4.2, yaw: -0.5, category: 'room' },
    { id: 'wp-kitchen', name: 'Kitchen Pass', x: 11.8, y: 4.2, yaw: 1.57, category: 'room' },
    { id: 'wp-lab', name: 'Kenny Lab', x: 5.2, y: 10.3, yaw: 3.14, category: 'room' },
    { id: 'wp-bedroom', name: 'Bedroom Entry', x: 10.6, y: 10.2, yaw: 0, category: 'room' },
  ],
  syncLog: [
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      direction: 'inbound',
      title: 'Map synced from Kenny',
      detail: 'Loaded Kenny_Home_Floor1.yaml (16m × 12m @ 5cm/px)',
      status: 'ok',
    },
  ],
  lastUpdatedAt: new Date().toISOString(),
};

function addLog(direction, title, detail, status = 'ok') {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    direction,
    title,
    detail,
    status,
  };
  state.syncLog = [entry, ...state.syncLog].slice(0, 25);
  return entry;
}

// ============================================================================
// Simple Grid A* Path Planner on the Saved Map
// ============================================================================
const GRID_STEP = 0.4; // 40cm planning grid
const ROBOT_RADIUS = 0.28;

function isBlocked(x, y) {
  if (x < 0.45 || x > savedMap.widthMeters - 0.45 || y < 0.45 || y > savedMap.heightMeters - 0.45) {
    return true;
  }
  const boxes = [...savedMap.walls, ...savedMap.obstacles];
  for (const b of boxes) {
    if (
      x >= b.x - ROBOT_RADIUS &&
      x <= b.x + b.w + ROBOT_RADIUS &&
      y >= b.y - ROBOT_RADIUS &&
      y <= b.y + b.h + ROBOT_RADIUS
    ) {
      return true;
    }
  }
  return false;
}

function computePath(start, goal) {
  const cols = Math.ceil(savedMap.widthMeters / GRID_STEP);
  const rows = Math.ceil(savedMap.heightMeters / GRID_STEP);

  const toCell = (p) => ({
    c: Math.max(1, Math.min(cols - 2, Math.round(p.x / GRID_STEP))),
    r: Math.max(1, Math.min(rows - 2, Math.round(p.y / GRID_STEP))),
  });
  const toWorld = (c, r) => ({
    x: Number((c * GRID_STEP).toFixed(2)),
    y: Number((r * GRID_STEP).toFixed(2)),
  });

  const s = toCell(start);
  const g = toCell(goal);
  const key = (c, r) => `${c},${r}`;

  const open = [{ c: s.c, r: s.r, g: 0, f: Math.hypot(g.c - s.c, g.r - s.r) }];
  const cameFrom = new Map();
  const gScore = new Map([[key(s.c, s.r), 0]]);
  const closed = new Set();

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ];

  let found = false;
  let iterations = 0;

  while (open.length > 0 && iterations < 3000) {
    iterations++;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const cKey = key(current.c, current.r);
    if (closed.has(cKey)) continue;
    closed.add(cKey);

    if (current.c === g.c && current.r === g.r) {
      found = true;
      break;
    }

    for (const [dc, dr, cost] of dirs) {
      const nc = current.c + dc;
      const nr = current.r + dr;
      if (nc < 1 || nc >= cols - 1 || nr < 1 || nr >= rows - 1) continue;
      const nKey = key(nc, nr);
      if (closed.has(nKey)) continue;

      const world = toWorld(nc, nr);
      const isGoalCell = nc === g.c && nr === g.r;
      if (!isGoalCell && isBlocked(world.x, world.y)) continue;

      const tentativeG = current.g + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, { c: current.c, r: current.r });
        gScore.set(nKey, tentativeG);
        open.push({
          c: nc,
          r: nr,
          g: tentativeG,
          f: tentativeG + Math.hypot(g.c - nc, g.r - nr),
        });
      }
    }
  }

  if (!found) {
    // Fallback direct line if goal is inside a tight spot or custom uploaded map
    return [
      { x: start.x, y: start.y },
      { x: goal.x, y: goal.y },
    ];
  }

  const raw = [];
  let curr = { c: g.c, r: g.r };
  while (curr) {
    raw.unshift(toWorld(curr.c, curr.r));
    curr = cameFrom.get(key(curr.c, curr.r));
  }
  raw[0] = { x: start.x, y: start.y };
  raw[raw.length - 1] = { x: goal.x, y: goal.y };
  return raw;
}

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return total;
}

// ============================================================================
// Server-Sent Events (SSE) for Real-Time Goal Sync Back to Device
// ============================================================================
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

// ============================================================================
// Simulated Kenny Navigation Loop (moves Kenny smoothly along plannedPath)
// ============================================================================
let pathIndex = 1;
let totalGoalDistance = 0;

setInterval(() => {
  if (state.status !== 'navigating' || !state.activeGoal || state.plannedPath.length < 2) {
    return;
  }

  const speed = 0.16; // meters per 100ms tick (~1.6 m/s)
  const target = state.plannedPath[pathIndex];
  if (!target) return;

  const dx = target.x - state.pose.x;
  const dy = target.y - state.pose.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= speed) {
    state.pose.x = Number(target.x.toFixed(2));
    state.pose.y = Number(target.y.toFixed(2));
    pathIndex++;

    if (pathIndex >= state.plannedPath.length) {
      state.pose.yaw = state.activeGoal.yaw;
      state.status = 'reached';
      state.activeGoal.status = 'reached';
      state.progress = 1;
      state.remainingMeters = 0;
      state.lastUpdatedAt = new Date().toISOString();
      addLog(
        'robot',
        'Kenny reached set goal',
        `Arrived at ${state.activeGoal.label} (${state.activeGoal.x.toFixed(2)}m, ${state.activeGoal.y.toFixed(2)}m)`,
        'ok'
      );
      broadcast('goal_reached', state);
      broadcast('state', state);
      return;
    }
  } else {
    state.pose.x = Number((state.pose.x + (dx / dist) * speed).toFixed(2));
    state.pose.y = Number((state.pose.y + (dy / dist) * speed).toFixed(2));
    state.pose.yaw = Number(Math.atan2(dy, dx).toFixed(3));
  }

  const remainingPts = [{ x: state.pose.x, y: state.pose.y }, ...state.plannedPath.slice(pathIndex)];
  const rem = pathLength(remainingPts);
  state.remainingMeters = Number(rem.toFixed(2));
  state.progress =
    totalGoalDistance > 0 ? Number(Math.max(0, Math.min(0.99, 1 - rem / totalGoalDistance)).toFixed(3)) : 0;
  state.lastUpdatedAt = new Date().toISOString();
  broadcast('state', state);
}, 100);

// ============================================================================
// REST API Endpoints
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    robot: state.robotName,
    mapId: savedMap.id,
    connectedClients: clients.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/map', (_req, res) => {
  res.json(savedMap);
});

app.post('/api/map', (req, res) => {
  const { name, resolution, widthMeters, heightMeters, imageDataUrl } = req.body || {};
  savedMap = {
    ...savedMap,
    id: `custom-map-${Date.now()}`,
    name: name || 'Custom_Saved_Map.yaml',
    resolution: Number(resolution) || 0.05,
    widthMeters: Number(widthMeters) || savedMap.widthMeters,
    heightMeters: Number(heightMeters) || savedMap.heightMeters,
    imageDataUrl: imageDataUrl ?? savedMap.imageDataUrl,
    walls: imageDataUrl ? [] : savedMap.walls,
    obstacles: imageDataUrl ? [] : savedMap.obstacles,
    rooms: imageDataUrl ? [] : savedMap.rooms,
    updatedAt: new Date().toISOString(),
  };
  addLog('inbound', 'Saved map updated', `Synced ${savedMap.name} (${savedMap.widthMeters}m × ${savedMap.heightMeters}m)`, 'ok');
  broadcast('map', savedMap);
  broadcast('state', state);
  res.json(savedMap);
});

app.get('/api/state', (_req, res) => {
  res.json(state);
});

app.post('/api/user-pose', (req, res) => {
  const { x, y, yaw = 0 } = req.body || {};
  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y must be numbers' });
  }
  state.userPose = {
    x: Number(Math.max(0.5, Math.min(savedMap.widthMeters - 0.5, x)).toFixed(2)),
    y: Number(Math.max(0.5, Math.min(savedMap.heightMeters - 0.5, y)).toFixed(2)),
    yaw: Number(yaw),
  };
  state.lastUpdatedAt = new Date().toISOString();
  broadcast('state', state);
  return res.json(state.userPose);
});

app.post('/api/goal', (req, res) => {
  const { x, y, yaw = 0, label = 'Pinpoint Goal', deviceId = 'This Device' } = req.body || {};

  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'x and y coordinates are required' });
  }

  const clampedX = Number(Math.max(0.45, Math.min(savedMap.widthMeters - 0.45, x)).toFixed(2));
  const clampedY = Number(Math.max(0.45, Math.min(savedMap.heightMeters - 0.45, y)).toFixed(2));
  const clampedYaw = Number(Number(yaw || 0).toFixed(3));

  const now = new Date().toISOString();
  const path = computePath(state.pose, { x: clampedX, y: clampedY });
  totalGoalDistance = pathLength(path);
  pathIndex = 1;

  const goal = {
    id: `goal-${Date.now()}`,
    x: clampedX,
    y: clampedY,
    yaw: clampedYaw,
    label,
    sourceDevice: deviceId,
    createdAt: now,
    syncedBackAt: new Date().toISOString(),
    status: 'navigating',
    distanceMeters: Number(totalGoalDistance.toFixed(2)),
  };

  state.activeGoal = goal;
  state.plannedPath = path;
  state.status = 'navigating';
  state.progress = 0;
  state.remainingMeters = Number(totalGoalDistance.toFixed(2));
  state.lastUpdatedAt = goal.syncedBackAt;

  addLog(
    'outbound',
    'Goal received by API',
    `Pinpoint "${label}" (${clampedX}m, ${clampedY}m) from ${deviceId}`,
    'info'
  );
  addLog(
    'inbound',
    'Synced back to device & Kenny',
    `Kenny locked goal (${totalGoalDistance.toFixed(1)}m path) and started navigating`,
    'ok'
  );

  // Echo confirmed goal back to this device & all connected subscribers
  broadcast('goal_synced', { goal, state });
  broadcast('state', state);

  return res.status(201).json({
    ok: true,
    goal,
    state,
  });
});

app.delete('/api/goal', (_req, res) => {
  if (state.activeGoal) {
    state.activeGoal.status = 'canceled';
  }
  state.status = 'canceled';
  state.plannedPath = [];
  state.remainingMeters = 0;
  state.lastUpdatedAt = new Date().toISOString();
  addLog('robot', 'Navigation goal canceled', 'Kenny stopped and cleared active goal', 'warn');
  broadcast('state', state);
  res.json({ ok: true, state });
});

app.post('/api/waypoints', (req, res) => {
  const { name, x, y, yaw = 0 } = req.body || {};
  if (!name || typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'name, x, and y are required' });
  }
  const wp = {
    id: `wp-${Date.now()}`,
    name: String(name).trim().slice(0, 32),
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    yaw: Number(yaw),
    category: 'custom',
  };
  state.waypoints = [...state.waypoints, wp];
  addLog('outbound', 'Waypoint saved', `Saved "${wp.name}" at (${wp.x}m, ${wp.y}m)`, 'info');
  broadcast('state', state);
  res.status(201).json(wp);
});

app.delete('/api/waypoints/:id', (req, res) => {
  state.waypoints = state.waypoints.filter((w) => w.id !== req.params.id);
  broadcast('state', state);
  res.json({ ok: true });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  clients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ map: savedMap, state })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Kenny Sync API] Listening on http://localhost:${PORT}`);
});
