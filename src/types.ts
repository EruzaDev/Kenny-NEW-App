export interface Pose2D {
  x: number; // meters in map frame
  y: number; // meters in map frame
  yaw: number; // radians
}

export interface MapRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface SavedMap {
  id: string;
  name: string;
  resolution: number; // meters per cell/pixel
  widthMeters: number;
  heightMeters: number;
  origin: [number, number, number];
  updatedAt: string;
  imageDataUrl?: string | null;
  rooms: MapRoom[];
  walls: MapObstacle[];
  obstacles: MapObstacle[];
}

export type GoalStatus = 'pending' | 'synced' | 'navigating' | 'reached' | 'canceled';

export interface NavGoal {
  id: string;
  x: number;
  y: number;
  yaw: number;
  label: string;
  sourceDevice: string;
  createdAt: string;
  syncedBackAt: string;
  status: GoalStatus;
  distanceMeters?: number;
}

export interface Waypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  yaw: number;
  category: 'dock' | 'room' | 'custom';
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  direction: 'outbound' | 'inbound' | 'robot';
  title: string;
  detail: string;
  status: 'ok' | 'info' | 'warn';
}

export interface KennyState {
  robotName: string;
  online: boolean;
  battery: number;
  status: 'idle' | 'navigating' | 'reached' | 'canceled';
  pose: Pose2D;
  userPose: Pose2D;
  activeGoal: NavGoal | null;
  plannedPath: Array<{ x: number; y: number }>;
  progress: number; // 0 to 1
  remainingMeters: number;
  waypoints: Waypoint[];
  syncLog: SyncLogEntry[];
  lastUpdatedAt: string;
}
