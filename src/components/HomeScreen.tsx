import { useCallback, useRef } from 'react';
import type { KennyState, Pose2D, SavedMap, Waypoint } from '../types';

interface HomeScreenProps {
  map: SavedMap | null;
  state: KennyState | null;
  draftPin: Pose2D | null;
  pinLabel: string;
  sending: boolean;
  tripsCount: number;
  totalDistanceKm: number;
  onPlacePin: (pose: Pose2D) => void;
  onClearPin: () => void;
  onPinLabelChange: (label: string) => void;
  onSummonKenny: () => void;
  onSendGoal: () => void;
  onSendToDock: () => void;
  onCancelGoal: () => void;
  onTargetWaypoint: (wp: Waypoint) => void;
  onResync: () => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function HomeScreen({
  map,
  state,
  draftPin,
  pinLabel,
  sending,
  tripsCount,
  totalDistanceKm,
  onPlacePin,
  onClearPin,
  onPinLabelChange,
  onSummonKenny,
  onSendGoal,
  onSendToDock,
  onCancelGoal,
  onTargetWaypoint,
  onResync,
}: HomeScreenProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const widthMeters = map?.widthMeters ?? 16;
  const heightMeters = map?.heightMeters ?? 12;

  // Map meters -> 400x300 SVG viewBox coordinates
  const toSvgX = useCallback((mx: number) => (mx / widthMeters) * 400, [widthMeters]);
  const toSvgY = useCallback((my: number) => (my / heightMeters) * 300, [heightMeters]);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const mx = Number(Math.max(0.45, Math.min(widthMeters - 0.45, relX * widthMeters)).toFixed(2));
    const my = Number(Math.max(0.45, Math.min(heightMeters - 0.45, relY * heightMeters)).toFixed(2));
    const robot = state?.pose ?? { x: widthMeters / 2, y: heightMeters / 2 };
    const yaw = Number(Math.atan2(my - robot.y, mx - robot.x).toFixed(2));
    onPlacePin({ x: mx, y: my, yaw });
  };

  const robotPose = state?.pose ?? { x: 1.6, y: 7.8, yaw: 0 };
  const rx = toSvgX(robotPose.x);
  const ry = toSvgY(robotPose.y);
  const headingDeg = Math.round(((robotPose.yaw * 180) / Math.PI + 360) % 360);

  const userPose = state?.userPose;
  const dockWp = state?.waypoints.find((w) => w.category === 'dock') ?? {
    id: 'wp-dock',
    name: 'Base Dock',
    x: 1.5,
    y: 7.8,
    yaw: 0,
    category: 'dock' as const,
  };
  const kitchenWp = state?.waypoints.find((w) => w.name.toLowerCase().includes('kitchen'));
  const livingWp = state?.waypoints.find((w) => w.name.toLowerCase().includes('living'));

  const pathD =
    state?.plannedPath && state.plannedPath.length > 1
      ? state.plannedPath
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`)
          .join(' ')
      : '';

  const isNavigating = state?.status === 'navigating';
  const progressPct = Math.round((state?.progress ?? 0) * 100);

  const statusPillText = isNavigating
    ? `En route • ${state?.remainingMeters.toFixed(1) ?? '0.0'}m`
    : `Pose: x=${robotPose.x.toFixed(1)}m, y=${robotPose.y.toFixed(1)}m (${headingDeg}°)`;

  // Build activity items from live syncLog + friendly defaults
  const activityItems =
    state?.syncLog && state.syncLog.length > 0
      ? state.syncLog.slice(0, 4).map((entry) => ({
          id: entry.id,
          title: entry.title,
          subtitle: entry.detail,
          time: formatRelativeTime(entry.timestamp),
          icon:
            entry.direction === 'outbound'
              ? 'location_on'
              : entry.direction === 'robot'
                ? 'dock'
                : 'tune',
          badgeBg:
            entry.direction === 'outbound'
              ? 'bg-primary-fixed/50 text-primary'
              : entry.direction === 'robot'
                ? 'bg-surface-container text-on-surface-variant'
                : 'bg-surface-container-high text-on-surface',
        }))
      : [
          {
            id: 'default-1',
            title: 'Kitchen',
            subtitle: 'Summon completed',
            time: '12m ago',
            icon: 'location_on',
            badgeBg: 'bg-primary-fixed/50 text-primary',
          },
          {
            id: 'default-2',
            title: 'Base Dock',
            subtitle: 'Inductive charging ready',
            time: '1h ago',
            icon: 'dock',
            badgeBg: 'bg-surface-container text-on-surface-variant',
          },
          {
            id: 'default-3',
            title: 'Calibrated',
            subtitle: '2D LiDAR 5cm grid locked',
            time: '3h ago',
            icon: 'tune',
            badgeBg: 'bg-surface-container-high text-on-surface',
          },
        ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-margin space-y-4">
      {/* Interactive Map Canvas Card */}
      <div className="relative w-full rounded-2xl bg-surface-container-lowest p-4 shadow-kh-card border border-slate-200/70 overflow-hidden">
        {/* Map Top HUD Bar */}
        <div className="flex items-center justify-between gap-2 mb-2.5 z-10 relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed/60 text-on-primary-fixed shadow-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="text-[10px] tracking-wide uppercase font-bold">
              SLAM Active • 2D LiDAR
            </span>
          </span>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[11px] shadow-sm min-w-0">
            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
              explore
            </span>
            <span className="font-bold truncate">{statusPillText}</span>
          </div>
        </div>

        {/* Architectural Floor Plan / Live SLAM Occupancy SVG */}
        <div className="relative w-full aspect-[4/3] rounded-xl bg-surface-container-low overflow-hidden">
          <svg
            ref={svgRef}
            onClick={handleMapClick}
            className="w-full h-full cursor-crosshair select-none"
            fill="none"
            viewBox="0 0 400 300"
            xmlns="http://www.w3.org/2000/svg"
            role="application"
            aria-label="Kenny 2D LiDAR SLAM map. Tap anywhere to set a navigation pinpoint."
          >
            <defs>
              <pattern height="16" id="kh-slam-grid" patternUnits="userSpaceOnUse" width="16">
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="#bbcabf"
                  strokeOpacity="0.45"
                  strokeWidth="0.6"
                />
                <circle cx="0" cy="0" fill="#6c7a71" fillOpacity="0.35" r="0.8" />
              </pattern>
              <radialGradient
                id="kh-sweep-cone"
                cx="0"
                cy="0"
                r="115"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#00f5d4" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="90%" stopColor="#00bbf9" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#00f5d4" stopOpacity="0" />
              </radialGradient>
              <filter id="kh-laser-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Base Occupancy Grid Background */}
            <rect fill="#eff4ff" height="100%" width="100%" />
            <rect fill="url(#kh-slam-grid)" height="100%" width="100%" />

            {/* Custom Uploaded Map Image if provided */}
            {map?.imageDataUrl && (
              <image
                href={map.imageDataUrl}
                x="0"
                y="0"
                width="400"
                height="300"
                preserveAspectRatio="xMidYMid meet"
                opacity="0.9"
              />
            )}

            {/* Mapped Room Free-Space Zones */}
            {map?.rooms.map((room) => (
              <g key={room.id}>
                <rect
                  x={toSvgX(room.x)}
                  y={toSvgY(room.y)}
                  width={toSvgX(room.w)}
                  height={toSvgY(room.h)}
                  rx="4"
                  fill="#ffffff"
                  fillOpacity="0.82"
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeOpacity="0.4"
                  strokeWidth="0.9"
                />
                <text
                  x={toSvgX(room.x + 0.35)}
                  y={toSvgY(room.y + 0.75)}
                  fill="#6c7a71"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.8"
                >
                  {room.name.toUpperCase()}
                </text>
              </g>
            ))}

            {/* Scanned Obstacles (Furniture Point Clusters) */}
            {map?.obstacles.map((obs, idx) => (
              <g key={`obs-${idx}`}>
                <rect
                  x={toSvgX(obs.x)}
                  y={toSvgY(obs.y)}
                  width={toSvgX(obs.w)}
                  height={toSvgY(obs.h)}
                  rx="4"
                  fill="#e5eeff"
                  fillOpacity="0.9"
                  stroke="#10b981"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                />
                {obs.label && (
                  <text
                    x={toSvgX(obs.x + obs.w / 2)}
                    y={toSvgY(obs.y + obs.h / 2) + 2.5}
                    textAnchor="middle"
                    fill="#3c4a42"
                    fontSize="7"
                    fontWeight="600"
                  >
                    {obs.label}
                  </text>
                )}
              </g>
            ))}

            {/* Scanned LiDAR Perimeter & Interior Walls */}
            {map?.walls.map((w, idx) => (
              <rect
                key={`wall-${idx}`}
                x={toSvgX(w.x)}
                y={toSvgY(w.y)}
                width={Math.max(2.5, toSvgX(w.w))}
                height={Math.max(2.5, toSvgY(w.h))}
                rx="1.5"
                fill="#006c49"
                fillOpacity="0.88"
              />
            ))}

            {/* Base Docking Station */}
            <g transform={`translate(${toSvgX(dockWp.x)}, ${toSvgY(dockWp.y)})`}>
              <rect
                fill="#ffddb8"
                fillOpacity="0.85"
                height="20"
                rx="5"
                stroke="#fea619"
                strokeWidth="1.5"
                width="20"
                x="-10"
                y="-10"
              />
              <circle cx="0" cy="0" fill="#855300" r="3" />
              <text
                fill="#855300"
                fontSize="7.5"
                fontWeight="800"
                letterSpacing="0.6"
                textAnchor="middle"
                x="0"
                y="18"
              >
                BASE
              </text>
            </g>

            {/* User Current Position ("YOU") */}
            {userPose && (
              <g transform={`translate(${toSvgX(userPose.x)}, ${toSvgY(userPose.y)})`}>
                <circle cx="0" cy="0" r="10" fill="#10b981" fillOpacity="0.18" />
                <circle cx="0" cy="0" r="5" fill="#059669" stroke="#ffffff" strokeWidth="1.8" />
                <text
                  x="0"
                  y="-9"
                  textAnchor="middle"
                  fill="#005236"
                  fontSize="7.5"
                  fontWeight="800"
                >
                  YOU
                </text>
              </g>
            )}

            {/* Planned / Active Odometry Trajectory */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            )}

            {/* Active Synced Goal Marker */}
            {state?.activeGoal && state.activeGoal.status !== 'canceled' && (
              <g
                transform={`translate(${toSvgX(state.activeGoal.x)}, ${toSvgY(state.activeGoal.y)})`}
              >
                <circle
                  cx="0"
                  cy="0"
                  r="11"
                  fill="#10b981"
                  fillOpacity="0.2"
                  stroke="#10b981"
                  strokeWidth="1.5"
                />
                <circle cx="0" cy="0" r="3.5" fill="#006c49" />
              </g>
            )}

            {/* Draft Pinpoint Dropped by User */}
            {draftPin && (
              <g transform={`translate(${toSvgX(draftPin.x)}, ${toSvgY(draftPin.y)})`}>
                <circle
                  cx="0"
                  cy="0"
                  r="14"
                  fill="#10b981"
                  fillOpacity="0.22"
                  className="animate-ping"
                />
                <circle cx="0" cy="0" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="#006c49"
                  fontSize="8"
                  fontWeight="800"
                >
                  PIN
                </text>
              </g>
            )}

            {/* LiDAR Dynamic Scan Cone & Pulse Rings centered on Kenny */}
            <g transform={`translate(${rx}, ${ry})`} className="pointer-events-none">
              <circle cx="0" cy="0" fill="none" stroke="#00f5d4" className="animate-lidar-wave" />
              <circle
                cx="0"
                cy="0"
                fill="none"
                stroke="#10b981"
                className="animate-lidar-wave-delayed"
              />
              <circle
                cx="0"
                cy="0"
                r="42"
                fill="none"
                stroke="#00f5d4"
                strokeDasharray="2 4"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="0"
                r="76"
                fill="none"
                stroke="#00bbf9"
                strokeDasharray="3 5"
                strokeOpacity="0.28"
                strokeWidth="1"
              />
              <g className="animate-lidar-rotate">
                <path
                  d="M 0 0 L 82 -68 L 102 -28 Z"
                  fill="url(#kh-sweep-cone)"
                  opacity="0.75"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="104"
                  y2="-24"
                  stroke="#00f5d4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#kh-laser-glow)"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="104"
                  y2="-24"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
                <circle cx="104" cy="-24" r="2.2" fill="#ffffff" filter="url(#kh-laser-glow)" />
              </g>
            </g>

            {/* Robot Pose & Heading Marker (Kenny SLAM Node) */}
            <g transform={`translate(${rx}, ${ry})`} className="pointer-events-none">
              <circle className="animate-ping" cx="0" cy="0" fill="#00f5d4" fillOpacity="0.3" r="14" />
              <circle cx="0" cy="0" fill="#006c49" r="10.5" stroke="#ffffff" strokeWidth="2.2" />
              <polygon
                fill="#00f5d4"
                points="0,-8.5 3.5,-2 -3.5,-2"
                transform={`rotate(${headingDeg + 90})`}
              />
              <circle cx="0" cy="0" fill="#00f5d4" r="3" />
            </g>
          </svg>

          {/* Top-Right LiDAR Resolution & Rate Badges */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur text-on-surface-variant text-[10px] font-bold border border-outline-variant/40 shadow-sm">
              Res: {Math.round((map?.resolution ?? 0.05) * 100)}cm/grid
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur text-primary text-[10px] font-bold border border-outline-variant/40 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              15 Hz
            </span>
          </div>

          {/* Bottom-Left Room Quick-Jump Tags */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 z-10">
            {kitchenWp && (
              <button
                type="button"
                onClick={() => onTargetWaypoint(kitchenWp)}
                className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur text-on-surface text-[11px] font-semibold shadow-sm active:scale-95 transition-transform flex items-center gap-1 hover:bg-surface-container cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Kitchen
              </button>
            )}
            {livingWp && (
              <button
                type="button"
                onClick={() => onTargetWaypoint(livingWp)}
                className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur text-on-surface text-[11px] font-semibold shadow-sm active:scale-95 transition-transform flex items-center gap-1 hover:bg-surface-container cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
                Living
              </button>
            )}
            <button
              type="button"
              onClick={onSendToDock}
              className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur text-on-surface text-[11px] font-semibold shadow-sm active:scale-95 transition-transform flex items-center gap-1 hover:bg-surface-container cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              Dock
            </button>
          </div>

          {/* Bottom-Right Map Viewer Controls */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={onSummonKenny}
              title="Pinpoint my location"
              className="w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm flex items-center justify-center text-on-surface active:scale-95 transition-transform hover:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">my_location</span>
            </button>
            <button
              type="button"
              onClick={onResync}
              title="Resync SLAM Map"
              className="w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm flex items-center justify-center text-on-surface active:scale-95 transition-transform hover:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            </button>
          </div>
        </div>

        {/* Inline Draft Pinpoint Chip (appears when user taps the map) */}
        {draftPin && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-3 py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                push_pin
              </span>
              <input
                type="text"
                value={pinLabel}
                onChange={(e) => onPinLabelChange(e.target.value)}
                aria-label="Pinpoint label"
                className="bg-transparent text-[13px] font-bold text-on-surface focus:outline-none min-w-0 flex-1"
                placeholder="Pinpoint name"
              />
              <span className="font-mono text-[11px] text-on-surface-variant shrink-0">
                ({draftPin.x.toFixed(1)}, {draftPin.y.toFixed(1)}m)
              </span>
            </div>
            <button
              type="button"
              onClick={onClearPin}
              aria-label="Clear pinpoint"
              className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Active Navigation Progress Bar */}
        {isNavigating && state?.activeGoal && (
          <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-primary-fixed/30 px-3 py-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-on-primary-fixed">
                Heading to {state.activeGoal.label}
              </span>
              <span className="font-mono font-bold text-primary">
                {progressPct}% • {state.remainingMeters.toFixed(1)}m
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-container transition-all duration-300"
                style={{ width: `${Math.max(6, progressPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary Interactive Control Actions */}
      <div className="flex flex-col gap-2 w-full">
        {isNavigating ? (
          <button
            type="button"
            onClick={onCancelGoal}
            className="w-full min-h-[54px] rounded-full bg-error hover:bg-tertiary text-on-error text-[16px] font-bold flex items-center justify-center gap-2 shadow-kh-emergency active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">stop_circle</span>
            <span>Emergency Stop</span>
          </button>
        ) : draftPin ? (
          <button
            type="button"
            disabled={sending}
            onClick={onSendGoal}
            className="w-full min-h-[54px] rounded-full bg-primary-container hover:bg-primary text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-kh-cta active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">navigation</span>
            <span>{sending ? 'Sending Goal…' : `Send Kenny to ${pinLabel || 'Pinpoint'}`}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={sending}
            onClick={onSummonKenny}
            className="w-full min-h-[54px] rounded-full bg-primary-container hover:bg-primary text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-kh-cta active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px] animate-spin-slow">
              my_location
            </span>
            <span>{sending ? 'Summoning…' : 'Summon Kenny'}</span>
          </button>
        )}

        <button
          type="button"
          disabled={sending}
          onClick={onSendToDock}
          className="w-full min-h-[50px] rounded-full bg-surface-container-lowest text-on-surface text-[16px] font-semibold flex items-center justify-center gap-2 shadow-kh-card border border-slate-200/70 hover:bg-surface-container-low active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] text-on-surface-variant">
            home_pin
          </span>
          <span>Send to Dock</span>
        </button>
      </div>

      {/* Telemetry & Hardware Spec Grid */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[20px] leading-[28px] font-bold text-on-surface">
            Hardware &amp; Localization
          </h2>
          <span className="text-[11px] text-primary font-bold uppercase tracking-wider">
            v2.4 Firmware
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-kh-card border border-slate-200/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Hardware
              </span>
              <span className="text-[16px] text-on-surface font-extrabold mt-0.5">Mark IV</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-kh-card border border-slate-200/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Engine
              </span>
              <span className="text-[16px] text-on-surface font-extrabold mt-0.5">SLAM v2.4</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-[20px]">explore</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-kh-card border border-slate-200/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Trips
              </span>
              <span className="text-[20px] text-on-surface font-extrabold mt-0.5 tabular-nums">
                {tripsCount}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">navigation</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-kh-card border border-slate-200/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Distance
              </span>
              <span className="text-[20px] text-on-surface font-extrabold mt-0.5 tabular-nums">
                {totalDistanceKm.toFixed(1)}{' '}
                <span className="text-[14px] font-semibold text-on-surface-variant">km</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[20px]">route</span>
            </div>
          </div>
        </div>
      </div>

      {/* Robot Activity Log / Historical Timeline */}
      <div className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[20px] leading-[28px] font-bold text-on-surface">Recent Activity</h2>
          <span className="text-[11px] font-semibold text-on-surface-variant">Past 24 Hours</span>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-kh-card border border-slate-200/60 space-y-3">
          {activityItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.badgeBg}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] text-on-surface font-bold truncate">{item.title}</div>
                  <div className="text-[11px] text-on-surface-variant truncate">{item.subtitle}</div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-on-surface-variant shrink-0">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
