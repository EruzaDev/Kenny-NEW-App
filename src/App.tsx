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
import type { KennyState, Pose2D, SavedMap, Waypoint } from './types';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kenny_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  const [map, setMap] = useState<SavedMap | null>(null);
  const [state, setState] = useState<KennyState | null>(null);
  const [connected, setConnected] = useState(false);
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

  const showToast = useCallback((notice: Omit<ToastNotice, 'id'>) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ ...notice, id: `${Date.now()}` });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

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
      metaTheme.setAttribute('content', darkMode ? '#07120E' : '#F2F7F4');
    }
  }, [darkMode]);

  // Initial load + Live SSE subscription (receives goal echoes & Kenny movement back on this device)
  const loadInitial = useCallback(async () => {
    setSyncing(true);
    try {
      const [m, s] = await Promise.all([fetchMap(), fetchState()]);
      setMap(m);
      setState(s);
      setConnected(true);
    } catch {
      setConnected(false);
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
        setConnected(true);
      },
      onState: (s) => {
        setState(s);
        setConnected(true);
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
        setConnected(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [loadInitial, showToast, streamVersion]);

  const handlePlacePin = useCallback((pose: Pose2D) => {
    setDraftPin(pose);
    setPinLabel('Pinpoint Goal');
  }, []);

  const handlePinpointMe = useCallback(() => {
    if (!state) return;
    const pose: Pose2D = { ...state.userPose };
    setDraftPin(pose);
    setPinLabel('Where I Am');
    // Also keep API aware of user pose
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
      if (sentAtRef.current) {
        setLastEchoRoundtripMs(Math.max(1, Math.round(performance.now() - sentAtRef.current)));
      }
      // Update user location marker when sending "Where I Am"
      if (pinLabel.trim().toLowerCase().includes('where i am') || pinLabel.trim().toLowerCase().includes('my location')) {
        updateUserPose(draftPin).catch(() => {});
      }
    } catch {
      showToast({
        title: 'Sync failed',
        subtitle: 'Could not reach Kenny Sync API. Check connection.',
        variant: 'info',
      });
    } finally {
      setSending(false);
    }
  }, [draftPin, pinLabel, showToast]);

  const handleCancelGoal = useCallback(async () => {
    try {
      const res = await cancelGoal();
      setState(res.state);
      showToast({
        title: 'Goal canceled',
        subtitle: 'Kenny stopped navigation.',
        variant: 'info',
      });
    } catch {
      // ignore
    }
  }, [showToast]);

  const handleSelectWaypoint = useCallback((wp: Waypoint) => {
    setDraftPin({ x: wp.x, y: wp.y, yaw: wp.yaw });
    setPinLabel(wp.name);
  }, []);

  const handleSaveWaypoint = useCallback(
    async (name: string) => {
      if (!draftPin) return;
      try {
        await createWaypoint({ name, x: draftPin.x, y: draftPin.y, yaw: draftPin.yaw });
        showToast({
          title: 'Waypoint saved',
          subtitle: `"${name}" synced to Kenny's map`,
          variant: 'synced',
        });
      } catch {
        // ignore
      }
    },
    [draftPin, showToast]
  );

  const handleDeleteWaypoint = useCallback(async (id: string) => {
    try {
      await deleteWaypoint(id);
    } catch {
      // ignore
    }
  }, []);

  const handleUploadMapFile = useCallback(
    (file: File, widthMeters: number, heightMeters: number) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = typeof reader.result === 'string' ? reader.result : null;
          const updated = await uploadCustomMap({
            name: file.name,
            resolution: 0.05,
            widthMeters,
            heightMeters,
            imageDataUrl: dataUrl,
          });
          setMap(updated);
        } catch {
          showToast({
            title: 'Map upload failed',
            subtitle: 'Could not sync custom saved map to API.',
            variant: 'info',
          });
        }
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
