import type { KennyState, NavGoal, SavedMap, Waypoint } from '../types';
import {
  buildOfflineGoal,
  createOfflineWaypoint,
  deleteOfflineWaypoint,
  loadCachedMap,
  loadCachedState,
  saveCachedMap,
  saveCachedState,
  updateOfflineUserPose,
} from './offlineStore';

const REQUEST_TIMEOUT_MS = 3000;

export function getApiBase(): string {
  const custom = localStorage.getItem('kenny_api_base');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return '/api';
}

export function setApiBase(url: string) {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned || cleaned === '/api') {
    localStorage.removeItem('kenny_api_base');
  } else {
    localStorage.setItem('kenny_api_base', cleaned);
  }
}

export function getDeviceId(): string {
  let id = localStorage.getItem('kenny_device_id');
  if (!id) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    id = `Mobile-${suffix}`;
    localStorage.setItem('kenny_device_id', id);
  }
  return id;
}

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Device is offline');
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchMap(): Promise<{ map: SavedMap; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/map`);
    if (!res.ok) throw new Error('Failed to fetch Kenny saved map');
    const data = (await res.json()) as SavedMap;
    saveCachedMap(data);
    return { map: data, offline: false };
  } catch {
    return { map: loadCachedMap(), offline: true };
  }
}

export async function uploadCustomMap(payload: {
  name: string;
  resolution: number;
  widthMeters: number;
  heightMeters: number;
  imageDataUrl: string | null;
}): Promise<{ map: SavedMap; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to sync custom map');
    const data = (await res.json()) as SavedMap;
    saveCachedMap(data);
    return { map: data, offline: false };
  } catch {
    const current = loadCachedMap();
    const localMap: SavedMap = {
      ...current,
      id: `offline-map-${Date.now()}`,
      name: payload.name || 'Custom_Saved_Map.yaml',
      resolution: payload.resolution || 0.05,
      widthMeters: payload.widthMeters || current.widthMeters,
      heightMeters: payload.heightMeters || current.heightMeters,
      imageDataUrl: payload.imageDataUrl,
      walls: payload.imageDataUrl ? [] : current.walls,
      obstacles: payload.imageDataUrl ? [] : current.obstacles,
      rooms: payload.imageDataUrl ? [] : current.rooms,
      updatedAt: new Date().toISOString(),
    };
    saveCachedMap(localMap);
    return { map: localMap, offline: true };
  }
}

export async function fetchState(): Promise<{ state: KennyState; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/state`);
    if (!res.ok) throw new Error('Failed to fetch Kenny state');
    const data = (await res.json()) as KennyState;
    saveCachedState(data);
    return { state: data, offline: false };
  } catch {
    return { state: loadCachedState(), offline: true };
  }
}

export async function sendGoal(payload: {
  x: number;
  y: number;
  yaw: number;
  label: string;
}): Promise<{ ok: boolean; goal: NavGoal; state: KennyState; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        deviceId: getDeviceId(),
      }),
    });
    if (!res.ok) throw new Error('Failed to send goal to Kenny API');
    const data = (await res.json()) as { ok: boolean; goal: NavGoal; state: KennyState };
    saveCachedState(data.state);
    return { ...data, offline: false };
  } catch {
    const { goal, state } = buildOfflineGoal(loadCachedState(), loadCachedMap(), {
      ...payload,
      deviceId: getDeviceId(),
    });
    return { ok: true, goal, state, offline: true };
  }
}

export async function cancelGoal(): Promise<{ ok: boolean; state: KennyState; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/goal`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to cancel goal');
    const data = (await res.json()) as { ok: boolean; state: KennyState };
    saveCachedState(data.state);
    return { ...data, offline: false };
  } catch {
    const current = loadCachedState();
    const nextState: KennyState = {
      ...current,
      status: 'canceled',
      activeGoal: current.activeGoal ? { ...current.activeGoal, status: 'canceled' } : null,
      plannedPath: [],
      remainingMeters: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    saveCachedState(nextState);
    return { ok: true, state: nextState, offline: true };
  }
}

export async function updateUserPose(pose: { x: number; y: number; yaw?: number }) {
  const fullPose = { x: pose.x, y: pose.y, yaw: pose.yaw ?? 0 };
  updateOfflineUserPose(loadCachedState(), fullPose);
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/user-pose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPose),
    });
    if (!res.ok) throw new Error('Failed to update user location');
    return res.json();
  } catch {
    return fullPose;
  }
}

export async function createWaypoint(payload: {
  name: string;
  x: number;
  y: number;
  yaw: number;
}): Promise<{ waypoint: Waypoint; state: KennyState; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/waypoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save waypoint');
    const wp = (await res.json()) as Waypoint;
    const current = loadCachedState();
    const nextState = { ...current, waypoints: [...current.waypoints, wp] };
    saveCachedState(nextState);
    return { waypoint: wp, state: nextState, offline: false };
  } catch {
    const res = createOfflineWaypoint(loadCachedState(), payload);
    return { ...res, offline: true };
  }
}

export async function deleteWaypoint(id: string): Promise<{ state: KennyState; offline: boolean }> {
  try {
    const res = await fetchWithTimeout(`${getApiBase()}/waypoints/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete waypoint');
    const nextState = deleteOfflineWaypoint(loadCachedState(), id);
    return { state: nextState, offline: false };
  } catch {
    const nextState = deleteOfflineWaypoint(loadCachedState(), id);
    return { state: nextState, offline: true };
  }
}

export function subscribeEvents(handlers: {
  onConnected?: (data: { map: SavedMap; state: KennyState }) => void;
  onState?: (state: KennyState) => void;
  onMap?: (map: SavedMap) => void;
  onGoalSynced?: (data: { goal: NavGoal; state: KennyState }) => void;
  onGoalReached?: (state: KennyState) => void;
  onError?: () => void;
}): () => void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    handlers.onError?.();
    return () => {};
  }

  let es: EventSource | null = null;
  try {
    es = new EventSource(`${getApiBase()}/events`);
  } catch {
    handlers.onError?.();
    return () => {};
  }

  es.addEventListener('connected', (e) => {
    try {
      const payload = JSON.parse((e as MessageEvent).data) as { map: SavedMap; state: KennyState };
      saveCachedMap(payload.map);
      saveCachedState(payload.state);
      handlers.onConnected?.(payload);
    } catch {
      // ignore malformed event
    }
  });

  es.addEventListener('state', (e) => {
    try {
      const s = JSON.parse((e as MessageEvent).data) as KennyState;
      saveCachedState(s);
      handlers.onState?.(s);
    } catch {
      // ignore
    }
  });

  es.addEventListener('map', (e) => {
    try {
      const m = JSON.parse((e as MessageEvent).data) as SavedMap;
      saveCachedMap(m);
      handlers.onMap?.(m);
    } catch {
      // ignore
    }
  });

  es.addEventListener('goal_synced', (e) => {
    try {
      const payload = JSON.parse((e as MessageEvent).data) as { goal: NavGoal; state: KennyState };
      saveCachedState(payload.state);
      handlers.onGoalSynced?.(payload);
    } catch {
      // ignore
    }
  });

  es.addEventListener('goal_reached', (e) => {
    try {
      const s = JSON.parse((e as MessageEvent).data) as KennyState;
      saveCachedState(s);
      handlers.onGoalReached?.(s);
    } catch {
      // ignore
    }
  });

  es.onerror = () => {
    handlers.onError?.();
  };

  return () => es?.close();
}
