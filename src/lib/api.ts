import type { KennyState, NavGoal, SavedMap, Waypoint } from '../types';

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

export async function fetchMap(): Promise<SavedMap> {
  const res = await fetch(`${getApiBase()}/map`);
  if (!res.ok) throw new Error('Failed to fetch Kenny saved map');
  return res.json();
}

export async function uploadCustomMap(payload: {
  name: string;
  resolution: number;
  widthMeters: number;
  heightMeters: number;
  imageDataUrl: string | null;
}): Promise<SavedMap> {
  const res = await fetch(`${getApiBase()}/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to sync custom map');
  return res.json();
}

export async function fetchState(): Promise<KennyState> {
  const res = await fetch(`${getApiBase()}/state`);
  if (!res.ok) throw new Error('Failed to fetch Kenny state');
  return res.json();
}

export async function sendGoal(payload: {
  x: number;
  y: number;
  yaw: number;
  label: string;
}): Promise<{ ok: boolean; goal: NavGoal; state: KennyState }> {
  const res = await fetch(`${getApiBase()}/goal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      deviceId: getDeviceId(),
    }),
  });
  if (!res.ok) throw new Error('Failed to send goal to Kenny API');
  return res.json();
}

export async function cancelGoal(): Promise<{ ok: boolean; state: KennyState }> {
  const res = await fetch(`${getApiBase()}/goal`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to cancel goal');
  return res.json();
}

export async function updateUserPose(pose: { x: number; y: number; yaw?: number }) {
  const res = await fetch(`${getApiBase()}/user-pose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pose),
  });
  if (!res.ok) throw new Error('Failed to update user location');
  return res.json();
}

export async function createWaypoint(payload: {
  name: string;
  x: number;
  y: number;
  yaw: number;
}): Promise<Waypoint> {
  const res = await fetch(`${getApiBase()}/waypoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save waypoint');
  return res.json();
}

export async function deleteWaypoint(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/waypoints/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete waypoint');
}

export function subscribeEvents(handlers: {
  onConnected?: (data: { map: SavedMap; state: KennyState }) => void;
  onState?: (state: KennyState) => void;
  onMap?: (map: SavedMap) => void;
  onGoalSynced?: (data: { goal: NavGoal; state: KennyState }) => void;
  onGoalReached?: (state: KennyState) => void;
  onError?: () => void;
}): () => void {
  const es = new EventSource(`${getApiBase()}/events`);

  es.addEventListener('connected', (e) => {
    try {
      handlers.onConnected?.(JSON.parse((e as MessageEvent).data));
    } catch {
      // ignore malformed event
    }
  });

  es.addEventListener('state', (e) => {
    try {
      handlers.onState?.(JSON.parse((e as MessageEvent).data));
    } catch {
      // ignore
    }
  });

  es.addEventListener('map', (e) => {
    try {
      handlers.onMap?.(JSON.parse((e as MessageEvent).data));
    } catch {
      // ignore
    }
  });

  es.addEventListener('goal_synced', (e) => {
    try {
      handlers.onGoalSynced?.(JSON.parse((e as MessageEvent).data));
    } catch {
      // ignore
    }
  });

  es.addEventListener('goal_reached', (e) => {
    try {
      handlers.onGoalReached?.(JSON.parse((e as MessageEvent).data));
    } catch {
      // ignore
    }
  });

  es.onerror = () => {
    handlers.onError?.();
  };

  return () => es.close();
}
