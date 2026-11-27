import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react';
import type { KennyState, Pose2D, SavedMap } from '../types';

interface SlamMapCanvasProps {
  map: SavedMap | null;
  state: KennyState | null;
  draftPin: Pose2D | null;
  darkMode: boolean;
  sheetExpanded?: boolean;
  hasToast?: boolean;
  onPlacePin: (pose: Pose2D) => void;
  onCenterOnUser: () => void;
}

export function SlamMapCanvas({
  map,
  state,
  draftPin,
  darkMode,
  sheetExpanded = false,
  hasToast = false,
  onPlacePin,
  onCenterOnUser,
}: SlamMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Multi-touch pointer tracking for native pinch-to-zoom + 1-finger pan
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
    multiTouch: boolean;
    pinchStartDist: number;
    pinchStartZoom: number;
    pinchMidX: number;
    pinchMidY: number;
  } | null>(null);

  // Trigger a fresh sonar animation whenever the draft pinpoint moves
  useEffect(() => {
    if (draftPin) {
      setPulseKey((k) => k + 1);
    }
  }, [draftPin?.x, draftPin?.y]);

  const widthMeters = map?.widthMeters ?? 16;
  const heightMeters = map?.heightMeters ?? 12;

  // Convert SVG viewBox coordinates (0..widthMeters*100, 0..heightMeters*100)
  const SCALE = 100;
  const vbWidth = widthMeters * SCALE;
  const vbHeight = heightMeters * SCALE;

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsInteracting(true);

    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
        moved: false,
        multiTouch: false,
        pinchStartDist: 0,
        pinchStartZoom: zoom,
        pinchMidX: 0,
        pinchMidY: 0,
      };
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      gestureRef.current = {
        startX: midX,
        startY: midY,
        panX: pan.x,
        panY: pan.y,
        moved: true,
        multiTouch: true,
        pinchStartDist: Math.max(10, dist),
        pinchStartZoom: zoom,
        pinchMidX: midX,
        pinchMidY: midY,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId) || !gestureRef.current) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());
    const g = gestureRef.current;

    if (pts.length >= 2) {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const ratio = dist / Math.max(10, g.pinchStartDist);
      const nextZoom = Number(Math.max(0.75, Math.min(3.0, g.pinchStartZoom * ratio)).toFixed(2));
      g.moved = true;
      g.multiTouch = true;
      setZoom(nextZoom);
      setPan({
        x: g.panX + (midX - g.pinchMidX),
        y: g.panY + (midY - g.pinchMidY),
      });
      return;
    }

    if (pts.length === 1 && !g.multiTouch) {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.hypot(dx, dy) > 8) {
        g.moved = true;
        setPan({
          x: g.panX + dx,
          y: g.panY + dy,
        });
      }
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    const g = gestureRef.current;

    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      setIsInteracting(false);
    }

    if (e.type === 'pointercancel' || !g || g.moved || g.multiTouch || !map) return;

    // Convert tap position into map meters using SVG's screen CTM
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());

    const xMeters = Number((svgPt.x / SCALE).toFixed(2));
    const yMeters = Number((svgPt.y / SCALE).toFixed(2));

    if (
      xMeters >= 0.35 &&
      xMeters <= widthMeters - 0.35 &&
      yMeters >= 0.35 &&
      yMeters <= heightMeters - 0.35
    ) {
      const robot = state?.pose ?? { x: widthMeters / 2, y: heightMeters / 2 };
      const yaw = Number(Math.atan2(yMeters - robot.y, xMeters - robot.x).toFixed(2));
      onPlacePin({ x: xMeters, y: yMeters, yaw });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY < 0 ? 0.14 : -0.14;
    setZoom((z) => Number(Math.max(0.75, Math.min(3.0, z + delta)).toFixed(2)));
  };

  const pathD =
    state?.plannedPath && state.plannedPath.length > 1
      ? state.plannedPath
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x * SCALE} ${p.y * SCALE}`)
          .join(' ')
      : '';

  const robotPose = state?.pose;
  const userPose = state?.userPose;
  const activeGoal = state?.activeGoal;

  // Theme-aware translucent SLAM palette so the live aurora breathes subtly beneath
  const colors = darkMode
    ? {
        floor: 'rgba(8, 24, 18, 0.74)',
        roomFill: 'rgba(16, 42, 33, 0.62)',
        roomStroke: 'rgba(52, 211, 153, 0.24)',
        grid: 'rgba(52, 211, 153, 0.11)',
        wall: '#1d5c45',
        wallStroke: '#6ee7b7',
        obstacle: 'rgba(20, 52, 41, 0.84)',
        obstacleStroke: 'rgba(52, 211, 153, 0.36)',
        roomText: 'rgba(167, 243, 208, 0.48)',
        obstacleText: 'rgba(167, 243, 208, 0.62)',
      }
    : {
        floor: 'rgba(255, 255, 255, 0.68)',
        roomFill: 'rgba(248, 253, 250, 0.78)',
        roomStroke: 'rgba(5, 150, 105, 0.22)',
        grid: 'rgba(5, 150, 105, 0.1)',
        wall: '#0f4c3a',
        wallStroke: '#10b981',
        obstacle: 'rgba(209, 238, 224, 0.86)',
        obstacleStroke: 'rgba(16, 185, 129, 0.42)',
        roomText: 'rgba(6, 78, 59, 0.46)',
        obstacleText: 'rgba(6, 78, 59, 0.65)',
      };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative h-full w-full touch-none overflow-hidden bg-[var(--bg-map)] select-none"
    >
      {/* Live Ambient Aurora & Spatial Background Layer */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Drifting Liquid Orb 1 — Emerald / Mint */}
        <div
          className="animate-aurora-1 absolute -left-24 -top-20 h-[440px] w-[440px] rounded-full blur-[96px] sm:h-[580px] sm:w-[580px]"
          style={{
            background: darkMode
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.38) 0%, rgba(5, 150, 105, 0.14) 55%, transparent 75%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.34) 0%, rgba(110, 231, 183, 0.18) 55%, transparent 75%)',
          }}
        />
        {/* Drifting Liquid Orb 2 — Cyan / Teal */}
        <div
          className="animate-aurora-2 absolute -right-24 top-1/4 h-[420px] w-[420px] rounded-full blur-[104px] sm:h-[560px] sm:w-[560px]"
          style={{
            background: darkMode
              ? 'radial-gradient(circle, rgba(20, 184, 166, 0.32) 0%, rgba(6, 182, 212, 0.14) 52%, transparent 75%)'
              : 'radial-gradient(circle, rgba(45, 212, 191, 0.32) 0%, rgba(56, 189, 248, 0.16) 52%, transparent 75%)',
          }}
        />
        {/* Drifting Liquid Orb 3 — Deep Jade / Seafoam behind Bottom Sheet */}
        <div
          className="animate-aurora-3 absolute -bottom-24 left-1/4 h-[460px] w-[460px] rounded-full blur-[110px] sm:h-[600px] sm:w-[600px]"
          style={{
            background: darkMode
              ? 'radial-gradient(circle, rgba(52, 211, 153, 0.28) 0%, rgba(6, 95, 70, 0.2) 55%, transparent 78%)'
              : 'radial-gradient(circle, rgba(52, 211, 153, 0.28) 0%, rgba(167, 243, 208, 0.22) 55%, transparent 78%)',
          }}
        />

        {/* Subtle Spatial Dot-Matrix Backdrop */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: darkMode
              ? 'radial-gradient(rgba(167, 243, 208, 0.16) 1px, transparent 1px)'
              : 'radial-gradient(rgba(6, 78, 59, 0.13) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />

        {/* Living Concentric Spatial Pulse Rings */}
        <div className="animate-ambient-pulse absolute left-1/2 top-[40%] h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/15 dark:border-emerald-300/12" />
        <div className="animate-ambient-pulse absolute left-1/2 top-[40%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-400/15 dark:border-teal-300/12" />
      </div>

      {/* Interactive SLAM Map Viewport (centered above mobile bottom sheet) */}
      <div
        className="flex h-full w-full items-center justify-center px-2 pb-56 pt-16 sm:px-6 sm:pb-52 sm:pt-20"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transition: isInteracting ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <svg
          viewBox={`-30 -30 ${vbWidth + 60} ${vbHeight + 60}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          role="application"
          aria-label="Kenny saved SLAM map. Tap anywhere to drop a pinpoint goal, drag to pan, or pinch to zoom."
          className={`h-full max-h-[70dvh] w-full touch-none sm:max-w-[920px] ${
            isInteracting ? 'cursor-grabbing' : 'cursor-crosshair'
          }`}
        >
          <defs>
            <pattern id="slam-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke={colors.grid}
                strokeWidth="2"
              />
            </pattern>
            <radialGradient id="lidar-cone" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <filter id="emerald-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Map base floor */}
          <rect
            x="0"
            y="0"
            width={vbWidth}
            height={vbHeight}
            rx="24"
            fill={colors.floor}
            stroke={colors.roomStroke}
            strokeWidth="4"
          />

          {/* Custom Uploaded Saved Map Image (if provided) */}
          {map?.imageDataUrl && (
            <image
              href={map.imageDataUrl}
              x="0"
              y="0"
              width={vbWidth}
              height={vbHeight}
              preserveAspectRatio="xMidYMid meet"
              opacity={darkMode ? 0.85 : 0.95}
            />
          )}

          {/* Metric 1m x 1m Grid */}
          <rect x="0" y="0" width={vbWidth} height={vbHeight} rx="24" fill="url(#slam-grid)" />

          {/* Room Zones */}
          {map?.rooms.map((room) => (
            <g key={room.id}>
              <rect
                x={room.x * SCALE}
                y={room.y * SCALE}
                width={room.w * SCALE}
                height={room.h * SCALE}
                rx="12"
                fill={colors.roomFill}
                stroke={colors.roomStroke}
                strokeWidth="2"
              />
              <text
                x={(room.x + room.w / 2) * SCALE}
                y={(room.y + room.h / 2) * SCALE}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colors.roomText}
                fontSize="36"
                fontWeight="700"
                letterSpacing="2"
              >
                {room.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Obstacles (Furniture / Equipment in SLAM Map) */}
          {map?.obstacles.map((obs, i) => (
            <g key={`obs-${i}`}>
              <rect
                x={obs.x * SCALE}
                y={obs.y * SCALE}
                width={obs.w * SCALE}
                height={obs.h * SCALE}
                rx="12"
                fill={colors.obstacle}
                stroke={colors.obstacleStroke}
                strokeWidth="3"
              />
              {obs.label && (
                <text
                  x={(obs.x + obs.w / 2) * SCALE}
                  y={(obs.y + obs.h / 2) * SCALE}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.obstacleText}
                  fontSize="24"
                  fontWeight="600"
                >
                  {obs.label}
                </text>
              )}
            </g>
          ))}

          {/* SLAM Walls */}
          {map?.walls.map((w, i) => (
            <rect
              key={`wall-${i}`}
              x={w.x * SCALE}
              y={w.y * SCALE}
              width={w.w * SCALE}
              height={w.h * SCALE}
              rx="6"
              fill={colors.wall}
              stroke={colors.wallStroke}
              strokeOpacity="0.35"
              strokeWidth="2"
            />
          ))}

          {/* Saved Waypoints */}
          {state?.waypoints.map((wp) => (
            <g
              key={wp.id}
              transform={`translate(${wp.x * SCALE}, ${wp.y * SCALE})`}
              className="pointer-events-none"
            >
              <circle
                r="14"
                fill={darkMode ? '#064e3b' : '#d1fae5'}
                stroke="#10b981"
                strokeWidth="3"
              />
              <circle r="5" fill="#10b981" />
              <text
                y="34"
                textAnchor="middle"
                fill={darkMode ? '#a7f3d0' : '#065f46'}
                fontSize="22"
                fontWeight="600"
              >
                {wp.name}
              </text>
            </g>
          ))}

          {/* Animated Planned Path from Kenny to Set Goal */}
          {pathD && (
            <g>
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeOpacity="0.24"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <motion.path
                d={pathD}
                fill="none"
                stroke="#34d399"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="16 14"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, strokeDashoffset: [0, -60] }}
                transition={{
                  pathLength: { duration: 0.45, ease: 'easeOut' },
                  strokeDashoffset: { duration: 1.4, repeat: Infinity, ease: 'linear' },
                }}
              />
            </g>
          )}

          {/* User's Current Position ("You") */}
          {userPose && (
            <g transform={`translate(${userPose.x * SCALE}, ${userPose.y * SCALE})`}>
              <motion.circle
                r="34"
                fill="#10b981"
                fillOpacity="0.18"
                animate={{ r: [24, 48, 24], opacity: [0.45, 0.08, 0.45] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <circle r="18" fill="#059669" stroke="#ffffff" strokeWidth="5" />
              <text
                y="-28"
                textAnchor="middle"
                fill={darkMode ? '#6ee7b7' : '#047857'}
                fontSize="22"
                fontWeight="700"
              >
                YOU
              </text>
            </g>
          )}

          {/* Active Synced Goal on Kenny */}
          {activeGoal && activeGoal.status !== 'canceled' && (
            <g transform={`translate(${activeGoal.x * SCALE}, ${activeGoal.y * SCALE})`}>
              <motion.circle
                r="42"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                animate={{ r: [22, 56], opacity: [0.85, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
              <circle
                r="22"
                fill={activeGoal.status === 'reached' ? '#10b981' : 'rgba(16, 185, 129, 0.25)'}
                stroke="#10b981"
                strokeWidth="5"
                filter="url(#emerald-glow)"
              />
              <circle r="8" fill="#ffffff" />
              <text
                y="-34"
                textAnchor="middle"
                fill={darkMode ? '#34d399' : '#047857'}
                fontSize="24"
                fontWeight="700"
              >
                GOAL
              </text>
            </g>
          )}

          {/* Draft Pinpoint Dropped by User */}
          {draftPin && (
            <g key={pulseKey} transform={`translate(${draftPin.x * SCALE}, ${draftPin.y * SCALE})`}>
              <motion.circle
                r="16"
                fill="none"
                stroke="#34d399"
                strokeWidth="5"
                initial={{ r: 10, opacity: 0.95 }}
                animate={{ r: 68, opacity: 0 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
              />
              {/* Heading arrow */}
              <g transform={`rotate(${(draftPin.yaw * 180) / Math.PI})`}>
                <line
                  x1="0"
                  y1="0"
                  x2="52"
                  y2="0"
                  stroke="#34d399"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <polygon points="62,0 44,-11 44,11" fill="#34d399" />
              </g>
              {/* Bouncing Pin Marker */}
              <motion.g
                initial={{ y: -38, scale: 0.6, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 20 }}
              >
                <circle r="20" fill="#10b981" stroke="#ffffff" strokeWidth="5" filter="url(#emerald-glow)" />
                <circle r="7" fill="#064e3b" />
              </motion.g>
            </g>
          )}

          {/* Kenny Live Robot Footprint + Heading Cone */}
          {robotPose && (
            <g
              transform={`translate(${robotPose.x * SCALE}, ${robotPose.y * SCALE}) rotate(${
                (robotPose.yaw * 180) / Math.PI
              })`}
            >
              {/* Lidar / forward FOV cone */}
              <path
                d="M 0 0 L 110 -48 A 120 120 0 0 1 110 48 Z"
                fill="url(#lidar-cone)"
              />
              {/* Robot chassis */}
              <circle
                r="28"
                fill={darkMode ? '#064e3b' : '#047857'}
                stroke="#34d399"
                strokeWidth="5"
                filter="url(#emerald-glow)"
              />
              {/* Forward bumper / direction indicator */}
              <polygon points="22,0 4,-12 4,12" fill="#ecfdf5" />
            </g>
          )}
        </svg>
      </div>

      {/* Floating Map Controls (Liquid Glass, thumb-zone on mobile) */}
      <div
        className={`pointer-events-auto fixed right-3 z-20 flex flex-col gap-2 transition-opacity duration-200 sm:bottom-auto sm:right-5 sm:top-24 ${
          sheetExpanded
            ? 'pointer-events-none opacity-0 sm:pointer-events-auto sm:opacity-100'
            : 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+15.5rem)] opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={onCenterOnUser}
          aria-label="Pinpoint my current location"
          title="Pinpoint my location"
          className="liquid-glass-btn flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl text-emerald-600 active:opacity-80 dark:text-emerald-300"
        >
          <LocateFixed className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="liquid-glass flex flex-col overflow-hidden rounded-2xl">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
            aria-label="Zoom in map"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-emerald-500/15 hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-300"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="h-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
            aria-label="Zoom out map"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-emerald-500/15 hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-300"
          >
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="h-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset map zoom and pan"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--text-secondary)] transition-colors hover:bg-emerald-500/15 hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tap Hint Pill (Liquid Glass) */}
      {!draftPin && state?.status !== 'navigating' && !hasToast && !sheetExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+4.35rem)] z-20 flex justify-center px-3"
        >
          <div className="liquid-glass flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)]">
            <Crosshair className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-300" aria-hidden="true" />
            <span>Tap map to drop pinpoint · Pinch to zoom</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
