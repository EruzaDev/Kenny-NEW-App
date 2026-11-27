interface AppHeaderProps {
  connected: boolean;
  onShowLanding: () => void;
  onResync: () => void;
  syncing: boolean;
}

export function AppHeader({ connected, onShowLanding, onResync, syncing }: AppHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-md mx-auto h-16 px-margin flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowLanding}
            className="flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            title="View Landing Page"
          >
            <span className="material-symbols-outlined text-primary text-[26px]">smart_toy</span>
            <span className="text-[20px] leading-[28px] text-on-surface tracking-tight font-extrabold">
              Kenny
            </span>
          </button>

          <button
            type="button"
            onClick={onResync}
            disabled={syncing}
            title={connected ? 'Connected to Kenny Sync API — tap to resync' : 'Running offline — tap to reconnect'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              connected
                ? 'bg-primary-fixed/40 text-on-primary-fixed-variant'
                : 'bg-secondary-fixed/70 text-on-secondary-fixed-variant'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-primary-container animate-pulse' : 'bg-secondary-container'
              }`}
            />
            <span className="text-[11px] uppercase tracking-wider font-bold">
              {syncing ? 'Syncing' : connected ? 'Online' : 'Offline'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onShowLanding}
          aria-label="Open Kenny overview"
          title="Kenny Overview"
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
        </button>
      </div>
    </header>
  );
}
