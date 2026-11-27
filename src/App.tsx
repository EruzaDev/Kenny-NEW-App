import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { SlamMapCanvas } from './components/SlamMapCanvas';
import { BottomControlSheet } from './components/BottomControlSheet';
import { GoalToast, type ToastNotice } from './components/GoalToast';
import {
  cancelGoal,
  createWaypoint,
  deleteWaypoint,
  fetchMap,
  fetchState,
  sendGoal,
  subscribeEvents,
  updateUserPose,
  uploadCustomMap,
} from './lib/api';
import { loadCachedMap, loadCachedState, saveCachedState } from './lib/offlineStore';
import type { KennyState, Pose2D, SavedMap, Waypoint } from './types';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kenny_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  // Immediately hydrate from local cache so the APK works 100% offline on cold launch
  const [map, setMap] = useState<SavedMap | null>(() => loadCachedMap());
  const [state, setState] = useState<KennyState | null>(() => loadCachedState());
  const [networkOnline, setNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [apiConnected, setApiConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftPin, setDraftPin] = useState<Pose2D | null>(null);
  const [pinLabel, setPinLabel] = useState('My Location');
  const [lastEchoRoundtripMs, setLastEchoRoundtripMs] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [streamVersion, setStreamVersion] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const sentAtRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const connected = networkOnline && apiConnected;

  const showToast = useCallback((notice: Omit<ToastNotice, 'id'>) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ ...notice, id: `${Date.now()}` });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  // Track device network online/offline transitions
  useEffect(() => {
    const onOnline = () => {
      setNetworkOnline(true);
      setStreamVersion((v) => v + 1);
    };
    const onOffline = () => {
      setNetworkOnline(false);
      setApiConnected(false);
      showToast({
        title: 'Offline mode active',
        subtitle: 'Running on cached SLAM map locally',
        variant: 'info',
      });
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [showToast]);

  // Apply Dark / Light mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('kenny_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('kenny_theme', 'light');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', darkMode ? '#040D0A' : '#E6F4EE');
    }
  }, [darkMode]);

  // Initial load + Live SSE subscription (gracefully falls back to offline cache)
  const loadInitial = useCallback(async () => {
    setSyncing(true);
    try {
      const [mapRes, stateRes] = await Promise.all([fetchMap(), fetchState()]);
      setMap(mapRes.map);
      setState(stateRes.state);
      const isOnline = !mapRes.offline && !stateRes.offline;
      setApiConnected(isOnline);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
    const unsubscribe = subscribeEvents({
      onConnected: ({ map: m, state: s }) => {
        setMap(m);
        setState(s);
        setApiConnected(true);
      },
      onState: (s) => {
        setState(s);
        setApiConnected(true);
      },
      onMap: (m) => {
        setMap(m);
        showToast({
          title: 'Kenny saved map synced',
          subtitle: `${m.name} (${m.widthMeters}m × ${m.heightMeters}m)`,
          variant: 'info',
        });
      },
      onGoalSynced: ({ goal, state: s }) => {
        setState(s);
        setApiConnected(true);
        if (sentAtRef.current) {
          setLastEchoRoundtripMs(Math.max(1, Math.round(performance.now() - sentAtRef.current)));
          sentAtRef.current = null;
        }
        showToast({
          title: 'Goal synced back to device',
          subtitle: `Kenny locked "${goal.label}" (${goal.x.toFixed(2)}m, ${goal.y.toFixed(2)}m)`,
          variant: 'synced',
        });
      },
      onGoalReached: (s) => {
        setState(s);
        showToast({
          title: 'Kenny arrived at goal',
          subtitle: `Reached ${s.activeGoal?.label ?? 'target'} safely`,
          variant: 'reached',
        });
      },
      onError: () => {
        setApiConnected(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [loadInitial, showToast, streamVersion]);

  // Local offline navigation simulation so goal preview works seamlessly without a server
  useEffect(() => {
    if (connected || state?.status !== 'navigating' || !state.activeGoal) return;

    const timer = window.setInterval(() => {
      setState((prev) => {
        if (!prev || prev.status !== 'navigating' || !prev.activeGoal) return prev;
        const target = prev.activeGoal;
        const dx = target.x - prev.pose.x;
        const dy = target.y - prev.pose.y;
        const dist = Math.hypot(dx, dy);
        const step = 0.22;

        if (dist <= step) {
          const done: KennyState = {
            ...prev,
            status: 'reached',
            pose: { x: target.x, y: target.y, yaw: target.yaw },
            activeGoal: { ...target, status: 'reached' },
            progress: 1,
            remainingMeters: 0,
            lastUpdatedAt: new Date().toISOString(),
          };
          saveCachedState(done);
          showToast({
            title: 'Offline simulation arrived',
            subtitle: `Previewed arrival at ${target.label}`,
            variant: 'reached',
          });
          return done;
        }

        const total = target.distanceMeters || dist;
        const nextPose = {
          x: Number((prev.pose.x + (dx / dist) * step).toFixed(2)),
          y: Number((prev.pose.y + (dy / dist) * step).toFixed(2)),
          yaw: Number(Math.atan2(dy, dx).toFixed(3)),
        };
        const remaining = Number(Math.hypot(target.x - nextPose.x, target.y - nextPose.y).toFixed(2));
        const next: KennyState = {
          ...prev,
          pose: nextPose,
          remainingMeters: remaining,
          progress: total > 0 ? Number(Math.max(0, Math.min(0.99, 1 - remaining / total)).toFixed(3)) : 0,
          lastUpdatedAt: new Date().toISOString(),
        };
        saveCachedState(next);
        return next;
      });
    }, 120);

    return () => window.clearInterval(timer);
  }, [connected, state?.status, state?.activeGoal?.id, showToast]);

  const handlePlacePin = useCallback((pose: Pose2D) => {
    setDraftPin(pose);
    setPinLabel('Pinpoint Goal');
  }, []);

  const handlePinpointMe = useCallback(() => {
    if (!state) return;
    const pose: Pose2D = { ...state.userPose };
    setDraftPin(pose);
    setPinLabel('Where I Am');
    updateUserPose(pose).catch(() => {});
  }, [state]);

  const handleSendGoal = useCallback(async () => {
    if (!draftPin) return;
    setSending(true);
    sentAtRef.current = performance.now();
    try {
      const result = await sendGoal({
        x: draftPin.x,
        y: draftPin.y,
        yaw: draftPin.yaw,
        label: pinLabel.trim() || 'Pinpoint Goal',
      });
      setState(result.state);
      setApiConnected(!result.offline);
      if (result.offline) {
        setLastEchoRoundtripMs(null);
        showToast({
          title: 'Saved offline locally',
          subtitle: `Previewing "${result.goal.label}" (${result.goal.x.toFixed(2)}m, ${result.goal.y.toFixed(2)}m)`,
          variant: 'info',
        });
      } else if (sentAtRef.current) {
        setLastEchoRoundtripMs(Math.max(1, Math.round(performance.now() - sentAtRef.current)));
      }
      if (
        pinLabel.trim().toLowerCase().includes('where i am') ||
        pinLabel.trim().toLowerCase().includes('my location')
      ) {
        updateUserPose(draftPin).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  }, [draftPin, pinLabel, showToast]);

  const handleCancelGoal = useCallback(async () => {
    const res = await cancelGoal();
    setState(res.state);
    showToast({
      title: 'Goal canceled',
      subtitle: res.offline ? 'Stopped offline preview.' : 'Kenny stopped navigation.',
      variant: 'info',
    });
  }, [showToast]);

  const handleSelectWaypoint = useCallback((wp: Waypoint) => {
    setDraftPin({ x: wp.x, y: wp.y, yaw: wp.yaw });
    setPinLabel(wp.name);
  }, []);

  const handleSaveWaypoint = useCallback(
    async (name: string) => {
      if (!draftPin) return;
      const res = await createWaypoint({ name, x: draftPin.x, y: draftPin.y, yaw: draftPin.yaw });
      setState(res.state);
      showToast({
        title: res.offline ? 'Waypoint saved offline' : 'Waypoint saved',
        subtitle: res.offline
          ? `"${name}" stored locally on this device`
          : `"${name}" synced to Kenny's map`,
        variant: 'synced',
      });
    },
    [draftPin, showToast]
  );

  const handleDeleteWaypoint = useCallback(async (id: string) => {
    const res = await deleteWaypoint(id);
    setState(res.state);
  }, []);

  const handleUploadMapFile = useCallback(
    (file: File, widthMeters: number, heightMeters: number) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null;
        const res = await uploadCustomMap({
          name: file.name,
          resolution: 0.05,
          widthMeters,
          heightMeters,
          imageDataUrl: dataUrl,
        });
        setMap(res.map);
        showToast({
          title: res.offline ? 'Custom map saved locally' : 'Custom map synced',
          subtitle: `${res.map.name} (${widthMeters}m × ${heightMeters}m)`,
          variant: res.offline ? 'info' : 'synced',
        });
      };
      reader.readAsDataURL(file);
    },
    [showToast]
  );

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <TopBar
        map={map}
        state={state}
        connected={connected}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        onResync={loadInitial}
        syncing={syncing}
      />

      <GoalToast notice={toast} />

      <SlamMapCanvas
        map={map}
        state={state}
        draftPin={draftPin}
        darkMode={darkMode}
        sheetExpanded={sheetExpanded}
        hasToast={Boolean(toast)}
        onPlacePin={handlePlacePin}
        onCenterOnUser={handlePinpointMe}
      />

      <BottomControlSheet
        map={map}
        state={state}
        draftPin={draftPin}
        pinLabel={pinLabel}
        sending={sending}
        expanded={sheetExpanded}
        lastEchoRoundtripMs={lastEchoRoundtripMs}
        onExpandedChange={setSheetExpanded}
        onPinLabelChange={setPinLabel}
        onDraftYawChange={(yaw) => setDraftPin((p) => (p ? { ...p, yaw } : null))}
        onPinpointMe={handlePinpointMe}
        onSendGoal={handleSendGoal}
        onCancelGoal={handleCancelGoal}
        onSelectWaypoint={handleSelectWaypoint}
        onSaveWaypoint={handleSaveWaypoint}
        onDeleteWaypoint={handleDeleteWaypoint}
        onUploadMapFile={handleUploadMapFile}
        onApiBaseChanged={() => setStreamVersion((v) => v + 1)}
      />
    </main>
  );
}

export default App;
