import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNav, type AppTab } from './components/BottomNav';
import { LandingScreen } from './components/LandingScreen';
import { HomeScreen } from './components/HomeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AboutScreen } from './components/AboutScreen';
import {
  cancelGoal,
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
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // Hydrate immediately from local cache so the app works 100% offline on cold launch
  const [map, setMap] = useState<SavedMap | null>(() => loadCachedMap());
  const [state, setState] = useState<KennyState | null>(() => loadCachedState());
  const [networkOnline, setNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [apiConnected, setApiConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftPin, setDraftPin] = useState<Pose2D | null>(null);
  const [pinLabel, setPinLabel] = useState('Pinpoint Goal');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [streamVersion, setStreamVersion] = useState(0);
  const [tripsCount, setTripsCount] = useState<number>(142);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(4.8);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const sentAtRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const connected = networkOnline && apiConnected;

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
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
      showToast('Offline mode active — using cached SLAM map');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [showToast]);

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
        showToast(`Synced map: ${m.name}`);
      },
      onGoalSynced: ({ goal, state: s }) => {
        setState(s);
        setApiConnected(true);
        if (sentAtRef.current) {
          setLatencyMs(Math.max(1, Math.round(performance.now() - sentAtRef.current)));
          sentAtRef.current = null;
        }
        showToast(`Kenny locked "${goal.label}"`);
      },
      onGoalReached: (s) => {
        setState(s);
        setTripsCount((t) => t + 1);
        if (s.activeGoal?.distanceMeters) {
          setTotalDistanceKm((d) => Number((d + s.activeGoal!.distanceMeters! / 1000).toFixed(2)));
        }
        showToast(`Kenny arrived at ${s.activeGoal?.label ?? 'target'}`);
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
        const step = 0.24;

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
          setTripsCount((t) => t + 1);
          if (target.distanceMeters) {
            setTotalDistanceKm((d) => Number((d + target.distanceMeters! / 1000).toFixed(2)));
          }
          showToast(`Arrived at ${target.label}`);
          return done;
        }

        const total = target.distanceMeters || dist;
        const nextPose = {
          x: Number((prev.pose.x + (dx / dist) * step).toFixed(2)),
          y: Number((prev.pose.y + (dy / dist) * step).toFixed(2)),
          yaw: Number(Math.atan2(dy, dx).toFixed(3)),
        };
        const remaining = Number(
          Math.hypot(target.x - nextPose.x, target.y - nextPose.y).toFixed(2)
        );
        const next: KennyState = {
          ...prev,
          pose: nextPose,
          remainingMeters: remaining,
          progress:
            total > 0 ? Number(Math.max(0, Math.min(0.99, 1 - remaining / total)).toFixed(3)) : 0,
          lastUpdatedAt: new Date().toISOString(),
        };
        saveCachedState(next);
        return next;
      });
    }, 110);

    return () => window.clearInterval(timer);
  }, [connected, state?.status, state?.activeGoal?.id, showToast]);

  const dispatchGoal = useCallback(
    async (pose: Pose2D, label: string) => {
      setSending(true);
      sentAtRef.current = performance.now();
      try {
        const result = await sendGoal({
          x: pose.x,
          y: pose.y,
          yaw: pose.yaw,
          label: label.trim() || 'Pinpoint Goal',
        });
        setState(result.state);
        setApiConnected(!result.offline);
        setDraftPin(null);
        if (result.offline) {
          showToast(`Navigating to ${result.goal.label} (offline preview)`);
        } else if (sentAtRef.current) {
          setLatencyMs(Math.max(1, Math.round(performance.now() - sentAtRef.current)));
          showToast(`Dispatched Kenny to ${result.goal.label}`);
        }
      } finally {
        setSending(false);
      }
    },
    [showToast]
  );

  const handlePlacePin = useCallback((pose: Pose2D) => {
    setDraftPin(pose);
    setPinLabel('Pinpoint Goal');
  }, []);

  const handleSummonKenny = useCallback(() => {
    if (!state) return;
    const pose: Pose2D = { ...state.userPose };
    updateUserPose(pose).catch(() => {});
    dispatchGoal(pose, 'My Location');
  }, [state, dispatchGoal]);

  const handleSendDraftGoal = useCallback(() => {
    if (!draftPin) return;
    dispatchGoal(draftPin, pinLabel);
  }, [draftPin, pinLabel, dispatchGoal]);

  const handleSendToDock = useCallback(() => {
    const dock = state?.waypoints.find((w) => w.category === 'dock') ?? {
      x: 1.5,
      y: 7.8,
      yaw: 0,
      name: 'Base Dock',
    };
    dispatchGoal({ x: dock.x, y: dock.y, yaw: dock.yaw }, dock.name);
  }, [state, dispatchGoal]);

  const handleTargetWaypoint = useCallback(
    (wp: Waypoint) => {
      dispatchGoal({ x: wp.x, y: wp.y, yaw: wp.yaw }, wp.name);
    },
    [dispatchGoal]
  );

  const handleCancelGoal = useCallback(async () => {
    const res = await cancelGoal();
    setState(res.state);
    showToast('Emergency Stop — navigation halted');
  }, [showToast]);

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
        showToast(`Loaded map: ${res.map.name}`);
      };
      reader.readAsDataURL(file);
    },
    [showToast]
  );

  if (showLanding) {
    return (
      <LandingScreen
        tripsCount={tripsCount}
        onOpenApp={() => {
          setShowLanding(false);
          setActiveTab('home');
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
      />
    );
  }

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-[100dvh] w-full antialiased">
      <AppHeader
        connected={connected}
        syncing={syncing}
        onResync={loadInitial}
        onShowLanding={() => {
          setShowLanding(true);
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
      />

      <main className="flex flex-col relative w-full pt-20 pb-28 bg-surface min-h-[100dvh]">
        {activeTab === 'home' && (
          <HomeScreen
            map={map}
            state={state}
            draftPin={draftPin}
            pinLabel={pinLabel}
            sending={sending}
            tripsCount={tripsCount}
            totalDistanceKm={totalDistanceKm}
            onPlacePin={handlePlacePin}
            onClearPin={() => setDraftPin(null)}
            onPinLabelChange={setPinLabel}
            onSummonKenny={handleSummonKenny}
            onSendGoal={handleSendDraftGoal}
            onSendToDock={handleSendToDock}
            onCancelGoal={handleCancelGoal}
            onTargetWaypoint={handleTargetWaypoint}
            onResync={loadInitial}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            connected={connected}
            state={state}
            map={map}
            latencyMs={latencyMs}
            onApiBaseChanged={() => setStreamVersion((v) => v + 1)}
            onResync={loadInitial}
            onUploadMapFile={handleUploadMapFile}
            onNotify={showToast}
          />
        )}

        {activeTab === 'about' && <AboutScreen onNotify={showToast} />}
      </main>

      {/* Kinetic Habitat Pill Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-4 py-2 rounded-full text-[12px] font-bold shadow-xl flex items-center gap-2 z-50 transition-all duration-300 pointer-events-none whitespace-nowrap max-w-[90vw] truncate ${
          toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="material-symbols-outlined text-[16px] text-primary-fixed shrink-0">
          check_circle
        </span>
        <span className="truncate">{toastMsg ?? ''}</span>
      </div>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default App;
