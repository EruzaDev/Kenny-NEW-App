import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Send,
  Settings2,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import type { KennyState, Pose2D, SavedMap, Waypoint } from '../types';
import { getApiBase, setApiBase } from '../lib/api';

type TabKey = 'pinpoint' | 'waypoints' | 'sync';

interface BottomControlSheetProps {
  map: SavedMap | null;
  state: KennyState | null;
  draftPin: Pose2D | null;
  pinLabel: string;
  sending: boolean;
  lastEchoRoundtripMs: number | null;
  onPinLabelChange: (label: string) => void;
  onDraftYawChange: (yaw: number) => void;
  onPinpointMe: () => void;
  onSendGoal: () => void;
  onCancelGoal: () => void;
  onSelectWaypoint: (wp: Waypoint) => void;
  onSaveWaypoint: (name: string) => void;
  onDeleteWaypoint: (id: string) => void;
  onUploadMapFile: (file: File, widthMeters: number, heightMeters: number) => void;
  onApiBaseChanged: () => void;
}

export function BottomControlSheet({
  map,
  state,
  draftPin,
  pinLabel,
  sending,
  lastEchoRoundtripMs,
  onPinLabelChange,
  onDraftYawChange,
  onPinpointMe,
  onSendGoal,
  onCancelGoal,
  onSelectWaypoint,
  onSaveWaypoint,
  onDeleteWaypoint,
  onUploadMapFile,
  onApiBaseChanged,
}: BottomControlSheetProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('pinpoint');
  const [expanded, setExpanded] = useState(false);
  const [newWpName, setNewWpName] = useState('');
  const [apiInput, setApiInput] = useState(getApiBase());
  const [mapWidth, setMapWidth] = useState(String(map?.widthMeters ?? 16));
  const [mapHeight, setMapHeight] = useState(String(map?.heightMeters ?? 12));

  const isNavigating = state?.status === 'navigating';
  const activeGoal = state?.activeGoal;
  const yawDeg = draftPin ? Math.round((draftPin.yaw * 180) / Math.PI) : 0;

  const handleSaveApi = () => {
    setApiBase(apiInput);
    onApiBaseChanged();
  };

  return (
    <motion.section
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      aria-label="Kenny navigation controls"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
    >
      <div className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/96 shadow-[var(--shadow-tinted)] backdrop-blur-xl">
        {/* Sheet Handle & Navigation Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
          <div className="flex flex-1 items-center gap-1 rounded-2xl bg-[var(--bg-surface-elevated)] p-1">
            {(
              [
                { id: 'pinpoint', label: 'Pinpoint', icon: MapPin },
                { id: 'waypoints', label: 'Saved', icon: Bookmark },
                { id: 'sync', label: 'API & Map', icon: Activity },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'text-white dark:text-emerald-950'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="active-sheet-tab"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-emerald-600 shadow-sm dark:bg-emerald-400"
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            aria-expanded={expanded}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:border-emerald-500/50 hover:text-[var(--text-primary)]"
          >
            {expanded ? (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Sheet Body */}
        <div
          className={`overflow-y-auto px-4 py-3.5 transition-[max-height] duration-200 ${
            expanded ? 'max-h-[60vh]' : 'max-h-[38vh] sm:max-h-[320px]'
          }`}
        >
          <AnimatePresence mode="wait">
            {/* TAB 1: PINPOINT & SEND GOAL */}
            {activeTab === 'pinpoint' && (
              <motion.div
                key="tab-pinpoint"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                {/* Live Active Goal Progress Banner (when Kenny is moving or reached) */}
                {activeGoal && activeGoal.status !== 'canceled' && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950">
                          {activeGoal.status === 'reached' ? (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Navigation className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                            {activeGoal.status === 'reached'
                              ? `Reached: ${activeGoal.label}`
                              : `Kenny Goal: ${activeGoal.label}`}
                          </p>
                          <p className="font-mono-num text-[11px] text-[var(--text-secondary)]">
                            X {activeGoal.x.toFixed(2)}m · Y {activeGoal.y.toFixed(2)}m
                            {lastEchoRoundtripMs !== null && ` · Echo ${lastEchoRoundtripMs}ms`}
                          </p>
                        </div>
                      </div>

                      {isNavigating && (
                        <button
                          type="button"
                          onClick={onCancelGoal}
                          aria-label="Stop Kenny navigation"
                          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/25 active:scale-95 dark:text-rose-400"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          <span>Stop</span>
                        </button>
                      )}
                    </div>

                    {isNavigating && (
                      <div className="mt-2.5 space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-950/15 dark:bg-emerald-950/60">
                          <motion.div
                            className="h-full rounded-full bg-emerald-500"
                            animate={{ width: `${Math.max(5, Math.round((state?.progress ?? 0) * 100))}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                        <div className="flex justify-between font-mono-num text-[11px] text-[var(--text-secondary)]">
                          <span>{Math.round((state?.progress ?? 0) * 100)}% complete</span>
                          <span>{(state?.remainingMeters ?? 0).toFixed(1)}m left</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Draft Pinpoint Details */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/70 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Map X
                    </span>
                    <span className="font-mono-num text-sm font-semibold text-[var(--text-primary)]">
                      {draftPin ? `${draftPin.x.toFixed(2)}m` : '--'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/70 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Map Y
                    </span>
                    <span className="font-mono-num text-sm font-semibold text-[var(--text-primary)]">
                      {draftPin ? `${draftPin.y.toFixed(2)}m` : '--'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/70 px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Heading
                    </span>
                    <span className="font-mono-num text-sm font-semibold text-[var(--text-primary)]">
                      {draftPin ? `${yawDeg}°` : '--'}
                    </span>
                  </div>
                </div>

                {/* Optional Heading & Label Controls when a pinpoint is dropped */}
                {draftPin && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={pinLabel}
                      onChange={(e) => onPinLabelChange(e.target.value)}
                      placeholder="Goal label (e.g. Where I am)"
                      aria-label="Pinpoint goal label"
                      className="h-11 flex-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500 focus:outline-none"
                    />
                    <label className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 px-3 text-xs font-medium text-[var(--text-secondary)]">
                      <Compass className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={yawDeg}
                        onChange={(e) =>
                          onDraftYawChange(Number(((Number(e.target.value) * Math.PI) / 180).toFixed(2)))
                        }
                        aria-label="Adjust Kenny arrival heading"
                        className="w-24 accent-emerald-500"
                      />
                    </label>
                  </div>
                )}

                {/* Thumb-Zone Primary CTAs (>= 48px touch targets, 8px+ gap) */}
                <div className="flex items-center gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={onPinpointMe}
                    className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-500/18 active:scale-[0.98] dark:text-emerald-300"
                  >
                    <LocateFixed className="h-4 w-4" aria-hidden="true" />
                    <span>Where I Am</span>
                  </button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={!draftPin || sending}
                    onClick={onSendGoal}
                    className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 ring-1 ring-inset ring-white/20 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                  >
                    <Send className={`h-4 w-4 ${sending ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    <span>{sending ? 'Syncing via API...' : 'Set Kenny Goal'}</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* TAB 2: SAVED WAYPOINTS */}
            {activeTab === 'waypoints' && (
              <motion.div
                key="tab-waypoints"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                {draftPin && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWpName}
                      onChange={(e) => setNewWpName(e.target.value)}
                      placeholder="Save current pinpoint as..."
                      aria-label="New waypoint name"
                      className="h-11 flex-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!newWpName.trim()}
                      onClick={() => {
                        if (!newWpName.trim()) return;
                        onSaveWaypoint(newWpName.trim());
                        setNewWpName('');
                      }}
                      className="flex h-11 cursor-pointer items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 dark:bg-emerald-500 dark:text-emerald-950"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Save</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {state?.waypoints.map((wp) => (
                    <div
                      key={wp.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 p-2.5 transition-colors hover:border-emerald-500/50"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectWaypoint(wp);
                          setActiveTab('pinpoint');
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {wp.name}
                          </p>
                          <p className="font-mono-num text-[11px] text-[var(--text-secondary)]">
                            X {wp.x.toFixed(1)}m · Y {wp.y.toFixed(1)}m
                          </p>
                        </div>
                      </button>

                      {wp.category === 'custom' && (
                        <button
                          type="button"
                          onClick={() => onDeleteWaypoint(wp.id)}
                          aria-label={`Delete waypoint ${wp.name}`}
                          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-rose-500/15 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 3: API SYNC LOG & CUSTOM MAP UPLOAD */}
            {activeTab === 'sync' && (
              <motion.div
                key="tab-sync"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="space-y-4"
              >
                {/* Custom API Endpoint */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    <Settings2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    <span>Kenny Sync API Endpoint</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiInput}
                      onChange={(e) => setApiInput(e.target.value)}
                      placeholder="/api or http://192.168.1.50:3001/api"
                      className="h-10 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 px-3 font-mono-num text-xs text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApi}
                      className="h-10 cursor-pointer rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {/* Upload Custom Saved Map Image */}
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-elevated)]/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Load Custom Kenny Saved Map
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Upload a PNG/JPG floorplan or exported ROS SLAM map
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={mapWidth}
                        onChange={(e) => setMapWidth(e.target.value)}
                        aria-label="Map width in meters"
                        className="h-9 w-14 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 font-mono-num text-xs text-[var(--text-primary)]"
                      />
                      <span className="text-xs text-[var(--text-muted)]">×</span>
                      <input
                        type="number"
                        value={mapHeight}
                        onChange={(e) => setMapHeight(e.target.value)}
                        aria-label="Map height in meters"
                        className="h-9 w-14 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 font-mono-num text-xs text-[var(--text-primary)]"
                      />
                      <span className="text-xs text-[var(--text-muted)]">m</span>
                    </div>
                  </div>
                  <label className="mt-2.5 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>Choose Saved Map Image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadMapFile(file, Number(mapWidth) || 16, Number(mapHeight) || 12);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Live API Round-Trip Sync Log */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    Live API & Device Sync Log
                  </p>
                  <div className="space-y-1.5">
                    {state?.syncLog.slice(0, 8).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50 px-3 py-2"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {entry.direction === 'outbound' ? (
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                              {entry.title}
                            </p>
                            <span className="shrink-0 font-mono-num text-[10px] text-[var(--text-muted)]">
                              {new Date(entry.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">{entry.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
