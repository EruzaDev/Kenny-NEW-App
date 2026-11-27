import { useCallback, useRef, useState } from 'react';

interface LandingScreenProps {
  onOpenApp: () => void;
  tripsCount: number;
}

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

function TiltGlassCard({ children, className = '' }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const applyTilt = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bounds = card.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const normX = x / bounds.width - 0.5;
    const normY = y / bounds.height - 0.5;

    const maxTilt = 12;
    const rotateX = Number((-normY * maxTilt).toFixed(2));
    const rotateY = Number((normX * maxTilt).toFixed(2));

    card.classList.add('tilt-active');
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(12px)`;
    card.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5 + 16}px 36px -6px rgba(16, 185, 129, 0.16), 0 4px 12px rgba(0,0,0,0.04), inset 0 1.5px 1px rgba(255,255,255,0.95)`;

    if (glareRef.current) {
      const glareX = ((normX + 0.5) * 100).toFixed(1);
      const glareY = ((normY + 0.5) * 100).toFixed(1);
      glareRef.current.style.opacity = '0.75';
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 70%)`;
    }
  }, []);

  const resetTilt = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove('tilt-active');
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    card.style.boxShadow = '';
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, []);

  return (
    <div className="tilt-card-wrapper">
      <div
        ref={cardRef}
        onMouseMove={(e) => applyTilt(e.clientX, e.clientY)}
        onMouseLeave={resetTilt}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest('.liquid-switch')) return;
          if (e.touches[0]) applyTilt(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) applyTilt(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={resetTilt}
        onTouchCancel={resetTilt}
        className={`liquid-glass-card tilt-card w-full select-none ${className}`}
        style={{ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)' }}
      >
        <div ref={glareRef} className="tilt-glare" />
        {children}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: 'slam',
    title: '2D LiDAR SLAM',
    subtitle: '15 Hz High-Speed',
    description: 'Real-time 5cm grid mapping for collision-free room navigation.',
    icon: 'grid_on',
    iconBg: 'from-primary-fixed to-white/70 text-on-primary-fixed',
    subtitleColor: 'text-primary',
  },
  {
    id: 'summon',
    title: 'Autonomous Summon',
    subtitle: 'Multi-Room Routing',
    description: 'Instant waypoint dispatch to your couch, desk, or kitchen.',
    icon: 'near_me',
    iconBg: 'from-cyan-100 to-white/70 text-cyan-800',
    subtitleColor: 'text-cyan-700',
  },
  {
    id: 'dock',
    title: 'Auto-Docking',
    subtitle: 'Infrared Guided',
    description: 'Automated return to base station for inductive charging.',
    icon: 'battery_charging_full',
    iconBg: 'from-amber-100 to-white/70 text-amber-800',
    subtitleColor: 'text-amber-700',
  },
] as const;

export function LandingScreen({ onOpenApp, tripsCount }: LandingScreenProps) {
  const [mode, setMode] = useState<'auto' | 'beacon'>('auto');
  const [radarIdx, setRadarIdx] = useState(0);
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({
    slam: true,
    summon: true,
    dock: true,
  });

  const radarStates = [
    mode === 'auto' ? '15 Hz • 360° Scan' : 'Beacon Active • ±2cm',
    '5cm Grid • Locked',
    `${tripsCount}+ Trips • Ready`,
    'LiDAR Quality: 99.4%',
  ];

  const handleCycleRadar = () => {
    setRadarIdx((i) => (i + 1) % radarStates.length);
  };

  const toggleFeature = (id: string) => {
    setFeatureStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#f6faff] text-on-surface flex flex-col">
      {/* Floating Frosted Glass Ambient Color Blobs Background */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-12 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-[#10b981]/30 to-[#4edea3]/25 blur-[75px] animate-orb-1" />
        <div className="absolute top-[28%] -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#06b6d4]/25 via-[#60a5fa]/20 to-[#6ffbbe]/25 blur-[80px] animate-orb-2" />
        <div className="absolute top-[62%] -left-16 w-80 h-80 rounded-full bg-gradient-to-tr from-[#10b981]/25 via-[#a7f3d0]/30 to-[#38bdf8]/20 blur-[75px] animate-orb-3" />
        <div className="absolute -bottom-16 right-4 w-72 h-72 rounded-full bg-gradient-to-bl from-[#006c49]/20 to-[#6ffbbe]/25 blur-[70px] animate-orb-1" />
      </div>

      {/* Header with Liquid Frosting */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-white/60 backdrop-blur-2xl border-b border-white/70 shadow-[0_4px_20px_rgba(16,185,129,0.05)]">
        <div className="max-w-md mx-auto h-16 px-margin flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-fixed to-primary-container/80 flex items-center justify-center shadow-inner border border-white/60">
              <span className="material-symbols-outlined material-symbols-filled text-on-primary-fixed text-[20px]">
                smart_toy
              </span>
            </div>
            <span className="text-[20px] font-bold tracking-tight text-on-surface drop-shadow-sm">
              Kenny
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenApp}
            className="min-h-[40px] px-4 rounded-full bg-primary/90 hover:bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center shadow-[0_4px_14px_rgba(0,108,73,0.25)] border border-white/30 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
          >
            Open App
          </button>
        </div>
      </header>

      <main className="flex flex-col relative w-full max-w-md mx-auto pt-16 pb-safe z-10">
        <div className="flex flex-col w-full px-margin pb-8 gap-8">
          {/* 1. Hero Section */}
          <section className="flex flex-col items-center text-center pt-4 gap-6">
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/70 backdrop-blur-xl border border-white/90 text-on-primary-fixed shadow-[0_4px_15px_rgba(16,185,129,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-[11px] tracking-wider uppercase font-bold text-primary">
                AUTONOMOUS • SLAM v2.4
              </span>
            </div>

            {/* Headline & Subtitle */}
            <div className="flex flex-col gap-2 max-w-sm">
              <h1 className="text-[30px] leading-[38px] font-extrabold text-on-surface tracking-tight">
                Meet Kenny.
              </h1>
              <p className="text-[16px] leading-[24px] text-on-surface-variant font-medium">
                Effortless autonomous waste management powered by real-time 2D LiDAR spatial
                awareness.
              </p>
            </div>

            {/* Stylized Liquid Glass 2D LiDAR Centerpiece */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Interactive LiDAR Scan Ring"
              onClick={handleCycleRadar}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCycleRadar();
                }
              }}
              className="relative w-60 h-60 flex items-center justify-center my-1 cursor-pointer select-none group"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-container/20 to-sky-400/20 blur-xl group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-2 rounded-full bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,108,73,0.1),inset_0_2px_4px_rgba(255,255,255,0.9)]" />
              <div className="absolute inset-7 rounded-full bg-gradient-to-b from-primary-fixed/30 to-white/40 border border-white/70" />
              <div className="absolute inset-14 rounded-full bg-gradient-to-tr from-primary-fixed/40 to-emerald-200/40 border border-white/90 shadow-inner" />

              {/* Rotating Sweep SVG */}
              <svg
                aria-hidden="true"
                className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] animate-spin motion-reduce:animate-none"
                fill="none"
                style={{ animationDuration: '4s' }}
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="landingLidarSweep"
                    x1="50"
                    x2="100"
                    y1="50"
                    y2="20"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M50 50 L50 2 A48 48 0 0 1 92 26 Z" fill="url(#landingLidarSweep)" />
                <line
                  stroke="#006c49"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                  x1="50"
                  x2="50"
                  y1="50"
                  y2="2"
                />
              </svg>

              {/* Detected Waypoint Dots */}
              <span
                className="absolute top-10 right-14 w-2.5 h-2.5 rounded-full bg-primary-container shadow-[0_0_8px_#10b981] animate-ping motion-reduce:animate-none"
                style={{ animationDuration: '2.2s' }}
              />
              <span className="absolute bottom-14 left-11 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] opacity-80" />

              {/* Center Robot Core */}
              <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_6px_20px_rgba(0,108,73,0.35),inset_0_2px_2px_rgba(255,255,255,0.6)] border border-white/50 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                <span className="material-symbols-outlined material-symbols-filled text-[26px]">
                  radar
                </span>
              </div>

              {/* Live Telemetry Micro-Readout Badge */}
              <div className="absolute -bottom-3 px-4 py-1 rounded-full bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] text-[11px] font-bold text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                <span>{radarStates[radarIdx]}</span>
              </div>
            </div>

            {/* Interactive Liquid Glass Mode Toggle */}
            <div className="w-full max-w-xs mt-1">
              <div
                className="liquid-pill-track p-1 rounded-full flex items-center relative select-none"
                role="tablist"
              >
                <div
                  className="liquid-pill-thumb absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{
                    transform: mode === 'auto' ? 'translateX(0%)' : 'translateX(100%)',
                  }}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'auto'}
                  onClick={() => {
                    setMode('auto');
                    setRadarIdx(0);
                  }}
                  className={`relative z-10 flex-1 py-2 text-center text-[12px] font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'auto' ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined material-symbols-filled text-[16px]">
                    auto_mode
                  </span>
                  <span>Auto SLAM</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'beacon'}
                  onClick={() => {
                    setMode('beacon');
                    setRadarIdx(0);
                  }}
                  className={`relative z-10 flex-1 py-2 text-center text-[12px] font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'beacon'
                      ? 'text-white'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">location_searching</span>
                  <span>Beacon Nav</span>
                </button>
              </div>
              <p className="text-[11px] leading-[14px] text-on-surface-variant text-center mt-2 font-medium">
                {mode === 'auto'
                  ? 'Active 5cm grid occupancy mapping & real-time path planning'
                  : 'Ultra-wideband room beacon tracking • Instant summon mode'}
              </p>
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-col w-full gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenApp}
                className="w-full min-h-[52px] rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(16,185,129,0.3),inset_0_1.5px_1.5px_rgba(255,255,255,0.4)] border border-white/30 hover:shadow-[0_10px_28px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Launch Dashboard</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <a
                href="#mission"
                className="w-full min-h-[46px] rounded-full bg-white/70 backdrop-blur-xl border border-white/85 text-on-surface text-[16px] font-semibold flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1.5px_1px_rgba(255,255,255,0.95)] hover:bg-white/90 transition-all active:scale-[0.98]"
              >
                Our Mission
              </a>
            </div>
          </section>

          {/* 2. Information (What Kenny Does) */}
          <section className="flex flex-col gap-4 tilt-perspective">
            <div className="flex items-center justify-between">
              <h2 className="text-[24px] leading-[32px] font-bold text-on-surface tracking-tight">
                What Kenny Does
              </h2>
              <span className="text-[11px] text-primary font-bold bg-white/70 backdrop-blur-md border border-white/80 px-2.5 py-1 rounded-full shadow-sm">
                Core Tech
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {FEATURES.map((feat) => {
                const isActive = featureStates[feat.id];
                return (
                  <TiltGlassCard key={feat.id} className="rounded-2xl p-4 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-tr ${feat.iconBg} border border-white/90 flex items-center justify-center shadow-inner`}
                        >
                          <span className="material-symbols-outlined text-[24px]">{feat.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-[16px] font-semibold text-on-surface">{feat.title}</h3>
                          <span className={`text-[11px] font-semibold ${feat.subtitleColor}`}>
                            {feat.subtitle}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={`Toggle ${feat.title} active state`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFeature(feat.id);
                        }}
                        className={`liquid-switch ${isActive ? 'active' : ''}`}
                      >
                        <div className="liquid-switch-dot" />
                      </button>
                    </div>
                    <p className="text-[14px] leading-[20px] text-on-surface-variant font-medium mt-1 relative z-10">
                      {feat.description}
                    </p>
                  </TiltGlassCard>
                );
              })}
            </div>
          </section>

          {/* 3. Mission & Footer CTA */}
          <section className="flex flex-col gap-6 tilt-perspective" id="mission">
            <TiltGlassCard className="rounded-3xl p-6 shadow-[0_16px_36px_-6px_rgba(16,185,129,0.12),inset_0_2px_1px_rgba(255,255,255,0.95)] flex flex-col gap-2">
              <div className="inline-flex items-center gap-1.5 text-primary font-bold relative z-10">
                <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                  eco
                </span>
                <span className="text-[12px] uppercase tracking-wider font-bold">Our Mission</span>
              </div>
              <p className="text-[20px] leading-[28px] text-on-surface tracking-tight font-extrabold relative z-10">
                “To make everyday home robotics invisible, reliable, and effortless—turning mundane
                chores into quiet autonomy.”
              </p>
            </TiltGlassCard>

            <footer className="flex flex-col items-center gap-4 pt-1">
              <button
                type="button"
                onClick={onOpenApp}
                className="w-full min-h-[52px] rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(0,108,73,0.3),inset_0_1.5px_1.5px_rgba(255,255,255,0.4)] border border-white/30 hover:opacity-95 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                <span>Open Kenny App</span>
              </button>
              <p className="text-[11px] text-on-surface-variant font-medium">
                Kinetic Habitat • Autonomous Domestic Robotics
              </p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
