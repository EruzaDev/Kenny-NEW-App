import { motion, AnimatePresence } from 'framer-motion';
import {
  BatteryCharging,
  Moon,
  Radio,
  RefreshCw,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { KennyState, SavedMap } from '../types';

interface TopBarProps {
  map: SavedMap | null;
  state: KennyState | null;
  connected: boolean;
  darkMode: boolean;
  onToggleTheme: () => void;
  onResync: () => void;
  syncing: boolean;
}

export function TopBar({
  map,
  state,
  connected,
  darkMode,
  onToggleTheme,
  onResync,
  syncing,
}: TopBarProps) {
  const statusLabel =
    state?.status === 'navigating'
      ? 'Navigating'
      : state?.status === 'reached'
        ? 'Arrived'
        : state?.status === 'canceled'
          ? 'Stopped'
          : 'Ready';

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-3 pt-safe sm:max-w-none sm:px-5">
      {/* Left: Liquid Glass Robot & Live Sync Pill */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="liquid-glass pointer-events-auto flex min-w-0 flex-1 items-center gap-2.5 rounded-[22px] px-3 py-2 sm:flex-initial sm:gap-3 sm:px-3.5 sm:py-2.5"
      >
        <div className="liquid-cta relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10 dark:text-emerald-950">
          <Radio className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-emerald-950/60 dark:border-emerald-950 ${
              connected ? 'bg-emerald-300 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-sm font-bold tracking-tight text-[var(--text-primary)] sm:text-base">
              {state?.robotName ?? 'Kenny-01'}
            </h1>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${
                state?.status === 'navigating'
                  ? 'bg-emerald-500/20 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-200'
                  : state?.status === 'reached'
                    ? 'bg-teal-500/20 text-teal-700 ring-1 ring-inset ring-teal-500/30 dark:text-teal-200'
                    : 'bg-white/40 text-[var(--text-secondary)] ring-1 ring-inset ring-white/40 dark:bg-white/10 dark:ring-white/10'
              }`}
            >
              {state?.status === 'navigating' && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] sm:text-xs">
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                connected
                  ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300'
                  : 'bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300'
              }`}
              title={connected ? 'Online — Connected to Kenny API' : 'Offline — Running on local cached map'}
            >
              {connected ? (
                <>
                  <Wifi className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>Offline</span>
                </>
              )}
            </span>
            <span className="truncate">{map?.name ?? 'Cached map'}</span>
            {state && (
              <>
                <span aria-hidden="true" className="opacity-40">
                  ·
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 font-mono-num">
                  <BatteryCharging
                    className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {state.battery}%
                </span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Right: Liquid Glass 44x44 Action Controls */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.04 }}
        className="pointer-events-auto flex shrink-0 items-center gap-2"
      >
        <div
          className="liquid-glass hidden items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-medium sm:flex"
          title={connected ? 'Live API stream connected' : 'Reconnecting to Kenny API'}
        >
          {connected ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-[var(--text-primary)]">Live Sync</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span className="text-amber-600 dark:text-amber-400">Offline</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onResync}
          aria-label="Resync saved map and Kenny state"
          className="liquid-glass-btn flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl text-[var(--text-primary)] hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-300"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={darkMode}
          className="liquid-glass-btn flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl text-[var(--text-primary)] hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-300"
        >
          <AnimatePresence mode="wait" initial={false}>
            {darkMode ? (
              <motion.span
                key="sun"
                initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 60, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16 }}
              >
                <Sun className="h-5 w-5 text-emerald-300" aria-hidden="true" />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ rotate: 60, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -60, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16 }}
              >
                <Moon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </header>
  );
}
