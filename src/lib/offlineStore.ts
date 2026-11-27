import type { KennyState, NavGoal, Pose2D, SavedMap, Waypoint } from '../types';

const MAP_STORAGE_KEY = 'kenny_offline_map_v1';
const STATE_STORAGE_KEY = 'kenny_offline_state_v1';

export const DEFAULT_OFFLINE_MAP: SavedMap = {
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
  walls: [
    { x: 0, y: 0, w: 16, h: 0.35 },
    { x: 0, y: 11.65, w: 16, h: 0.35 },
    { x: 0, y: 0, w: 0.35, h: 12 },
    { x: 15.65, y: 0, w: 0.35, h: 12 },
    { x: 7.8, y: 0.35, w: 0.3, h: 3.05 },
    { x: 7.8, y: 5.2, w: 0.3, h: 1.7 },
    { x: 0.35, y: 6.6, w: 2.85, h: 0.3 },
    { x: 5.0, y: 6.6, w: 3.1, h: 0.3 },
    { x: 8.1, y: 5.6, w: 2.7, h: 0.3 },
    { x: 12.8, y: 5.6, w: 2.85, h: 0.3 },
    { x: 0.35, y: 8.7, w: 1.85, h: 0.3 },
    { x: 3.8, y: 8.7, w: 6.8, h: 0.3 },
    { x: 12.2, y: 8.7, w: 3.45, h: 0.3 },
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

export const DEFAULT_OFFLINE_STATE: KennyState = {
  robotName: 'Kenny-01',
  online: false,
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
      id: 'offline-init',
      timestamp: new Date().toISOString(),
      direction: 'inbound',
      title: 'Offline SLAM map ready',
      detail: 'Loaded cached Kenny_Home_Floor1.yaml locally on device',
      status: 'info',
    },
  ],
  lastUpdatedAt: new Date().toISOString(),
};

export function loadCachedMap(): SavedMap {
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedMap;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_OFFLINE_MAP;
}

export function saveCachedMap(map: SavedMap) {
  try {
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

export function loadCachedState(): KennyState {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KennyState;
      return {
        ...DEFAULT_OFFLINE_STATE,
        ...parsed,
        waypoints: parsed.waypoints?.length ? parsed.waypoints : DEFAULT_OFFLINE_STATE.waypoints,
      };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_OFFLINE_STATE;
}

export function saveCachedState(state: KennyState) {
  try {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function buildOfflineGoal(
  currentState: KennyState,
  map: SavedMap,
  payload: { x: number; y: number; yaw: number; label: string; deviceId: string }
): { goal: NavGoal; state: KennyState } {
  const clampedX = Number(Math.max(0.45, Math.min(map.widthMeters - 0.45, payload.x)).toFixed(2));
  const clampedY = Number(Math.max(0.45, Math.min(map.heightMeters - 0.45, payload.y)).toFixed(2));
  const dist = Number(Math.hypot(clampedX - currentState.pose.x, clampedY - currentState.pose.y).toFixed(2));
  const now = new Date().toISOString();

  // Build an interpolated local path for smooth offline preview
  const steps = Math.max(4, Math.min(24, Math.ceil(dist / 0.5)));
  const path: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      x: Number((currentState.pose.x + (clampedX - currentState.pose.x) * t).toFixed(2)),
      y: Number((currentState.pose.y + (clampedY - currentState.pose.y) * t).toFixed(2)),
    });
  }

  const goal: NavGoal = {
    id: `offline-goal-${Date.now()}`,
    x: clampedX,
    y: clampedY,
    yaw: payload.yaw,
    label: payload.label,
    sourceDevice: payload.deviceId,
    createdAt: now,
    syncedBackAt: now,
    status: 'navigating',
    distanceMeters: dist,
  };

  const nextState: KennyState = {
    ...currentState,
    status: 'navigating',
    activeGoal: goal,
    plannedPath: path,
    progress: 0,
    remainingMeters: dist,
    lastUpdatedAt: now,
    syncLog: [
      {
        id: `log-off-${Date.now()}`,
        timestamp: now,
        direction: 'outbound' as const,
        title: 'Offline goal queued locally',
        detail: `Pinpoint "${payload.label}" (${clampedX}m, ${clampedY}m) — will sync when online`,
        status: 'warn' as const,
      },
      ...currentState.syncLog,
    ].slice(0, 25),
  };

  saveCachedState(nextState);
  return { goal, state: nextState };
}

export function createOfflineWaypoint(
  currentState: KennyState,
  payload: { name: string; x: number; y: number; yaw: number }
): { waypoint: Waypoint; state: KennyState } {
  const wp: Waypoint = {
    id: `wp-local-${Date.now()}`,
    name: payload.name.trim().slice(0, 32),
    x: Number(payload.x.toFixed(2)),
    y: Number(payload.y.toFixed(2)),
    yaw: Number(payload.yaw),
    category: 'custom',
  };
  const nextState: KennyState = {
    ...currentState,
    waypoints: [...currentState.waypoints, wp],
    lastUpdatedAt: new Date().toISOString(),
  };
  saveCachedState(nextState);
  return { waypoint: wp, state: nextState };
}

export function deleteOfflineWaypoint(currentState: KennyState, id: string): KennyState {
  const nextState: KennyState = {
    ...currentState,
    waypoints: currentState.waypoints.filter((w) => w.id !== id),
    lastUpdatedAt: new Date().toISOString(),
  };
  saveCachedState(nextState);
  return nextState;
}

export function updateOfflineUserPose(currentState: KennyState, pose: Pose2D): KennyState {
  const nextState: KennyState = {
    ...currentState,
    userPose: pose,
    lastUpdatedAt: new Date().toISOString(),
  };
  saveCachedState(nextState);
  return nextState;
}
