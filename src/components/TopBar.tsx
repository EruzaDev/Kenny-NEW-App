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
      {/* Left: Compact Mobile-First Robot & Live Sync Pill */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 py-2 shadow-[var(--shadow-tinted)] backdrop-blur-md sm:flex-initial sm:gap-3 sm:px-3.5 sm:py-2.5"
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-inner shadow-white/25 sm:h-10 sm:w-10 dark:bg-emerald-500 dark:text-emerald-950">
          <Radio className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-surface)] ${
              connected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-sm font-bold tracking-tight text-[var(--text-primary)] sm:text-base">
              {state?.robotName ?? 'Kenny-01'}
            </h1>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${
                state?.status === 'navigating'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : state?.status === 'reached'
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                    : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] sm:text-xs">
            <span className="inline-flex shrink-0 items-center gap-1 font-medium">
              {connected ? (
                <Wifi className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <WifiOff className="h-3 w-3 text-amber-500" aria-hidden="true" />
              )}
              <span className="sr-only">{connected ? 'API synced' : 'Offline'}</span>
            </span>
            <span className="truncate">{map?.name ?? 'Syncing map...'}</span>
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

      {/* Right: 44x44 Touch Action Controls */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.04 }}
        className="pointer-events-auto flex shrink-0 items-center gap-2"
      >
        <div
          className="hidden items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 py-2.5 text-xs font-medium shadow-[var(--shadow-tinted)] backdrop-blur-md sm:flex"
          title={connected ? 'Live API stream connected' : 'Reconnecting to Kenny API'}
        >
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="text-[var(--text-primary)]">API Synced</span>
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
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)] shadow-[var(--shadow-tinted)] backdrop-blur-md transition-colors hover:border-emerald-500/60 hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-400"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin text-emerald-500' : ''}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={darkMode}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)] shadow-[var(--shadow-tinted)] backdrop-blur-md transition-colors hover:border-emerald-500/60 hover:text-emerald-600 active:opacity-80 dark:hover:text-emerald-400"
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
                <Sun className="h-5 w-5 text-emerald-400" aria-hidden="true" />
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
