export type AppTab = 'home' | 'settings' | 'about';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const NAV_ITEMS: Array<{ id: AppTab; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: 'map' },
  { id: 'settings', label: 'Settings', icon: 'tune' },
  { id: 'about', label: 'About', icon: 'info' },
];

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none"
    >
      <div className="pointer-events-auto max-w-md mx-4 sm:mx-auto mb-4 rounded-full bg-white/85 backdrop-blur-md border border-white/60 shadow-kh-dock py-2 px-3 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[40px] flex items-center gap-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 px-4 py-1.5 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 px-3 py-1.5'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
