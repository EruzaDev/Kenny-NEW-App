import { useState } from 'react';

interface AboutScreenProps {
  onNotify: (msg: string) => void;
}

const TEAM_MEMBERS = [
  {
    name: 'Elena Rostova',
    initials: 'ER',
    badge: 'Lead Engineer',
    badgeClass: 'bg-primary-fixed/50 text-on-primary-fixed-variant',
    role: 'Hardware & Robotics',
    skills: ['ROS 2', 'ESP32-S3', 'SLAM'],
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBRoYMJGeK4D3XLQxjsKURX1oPqOjvwE_jp3FlaYh0CWyNcEh0TU3m8ip0KoS7tWcRGaPRi1b6EqsvJ5PJ-qjBcWBLRNDTycyU3mNF5j-v90c98hCuaTqN-2eFkgOW3w4hpuagA4wFL4-9aR3UmYgLtZ5GF-W7ZzL32vst-piDKyJ0KYY5Ja6UcDQ4v1znfoMdTUOqqv8k_XkIsaeoJL1mdZBRAjUseGDgjLXDmXxU',
    links: [
      { title: 'GitHub', icon: 'terminal' },
      { title: 'LinkedIn', icon: 'badge' },
      { title: 'Portfolio', icon: 'devices' },
    ],
  },
  {
    name: 'Marcus Vance',
    initials: 'MV',
    badge: 'Systems Architect',
    badgeClass: 'bg-surface-container-high text-on-surface-variant',
    role: 'Full-Stack & Telemetry',
    skills: ['FastAPI', 'WebSockets', 'Flutter'],
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDFF1U2v45lQwPvmh2ddP09Z1SvG11yLHtxSQLJL_lHp1XA4fXSD2woaR1726-pAPVvBS7tuP0Nw-59s3yTMB1_2dv016oiRGoxHizWtdYS2AtjZnVgJ8yAakMYyQacu3vUnGJLds1RjlISF-ljEPkwLM0oeCo-Wd6j3aN1Iwc1Y0GPZaizF2ss_9xs4Ooejy1m2K8qU0fziOOExRpLFDK4OPgSqXGre4aYdnwynGI',
    links: [
      { title: 'GitHub', icon: 'terminal' },
      { title: 'LinkedIn', icon: 'badge' },
      { title: 'DevLog', icon: 'code' },
    ],
  },
  {
    name: 'Chloe Tanaka',
    initials: 'CT',
    badge: 'UI/UX Designer',
    badgeClass: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    role: 'Industrial & Digital CMF',
    skills: ['CAD', 'Design Tokens', 'Prototyping'],
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQLZy-dqBfHEk7ikaN7mOpW-KOTAkpH0-EjYIo85Wfh8WPzDiejkJpGjkkpc3l83YWlV1U5jguefJIh68S4aTh3MsmAdN6BJNW9eQ5Jis1uZuWq-THnpjyFTeHAo9CnUJXkIk0erF_txaO5qfu9vvYbSQmF3qDCg_4pHzIOGmEREAW5Uk7tI016yPkV6KWa5HRzmZ1unMFmfIAnRrlWPperFeyi3bqz9ad76CywaI',
    links: [
      { title: 'Portfolio', icon: 'palette' },
      { title: 'LinkedIn', icon: 'badge' },
      { title: 'Behance', icon: 'photo_camera' },
    ],
  },
];

const STACK_ITEMS = [
  { title: 'ROS 2 Nav', subtitle: 'Nav2 & SLAM', icon: 'explore' },
  { title: 'ESP32 Core', subtitle: 'FreeRTOS Motor', icon: 'memory' },
  { title: 'FastAPI Pipe', subtitle: 'Live WebSockets', icon: 'sync_alt' },
  { title: 'Tactile UI', subtitle: 'Kinetic System', icon: 'touch_app' },
];

export function AboutScreen({ onNotify }: AboutScreenProps) {
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-margin gap-6">
      {/* Project Showcase Banner */}
      <section className="relative w-full rounded-2xl bg-surface-container p-4 shadow-sm overflow-hidden flex flex-col gap-2.5">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-primary-fixed/35 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-surface text-[11px] font-semibold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            v1.0.0 Engineering Build
          </span>
          <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
            Project ID: KNY-704
          </span>
        </div>

        <div className="z-10 mt-1">
          <h1 className="text-[24px] leading-[32px] text-on-surface tracking-tight font-extrabold">
            Kenny Project
          </h1>
          <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
            Autonomous Self-Driving Domestic Smart Can &amp; Kinetic Companion.
          </p>
        </div>

        <div className="z-10 grid grid-cols-3 gap-2 pt-1 mt-1">
          <div className="p-2.5 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center">
            <span className="material-symbols-outlined material-symbols-filled text-primary text-[20px] mb-0.5">
              sensors
            </span>
            <span className="text-[11px] text-on-surface font-bold">360° LiDAR</span>
            <span className="text-[10px] text-outline">Realtime SLAM</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center">
            <span className="material-symbols-outlined material-symbols-filled text-primary text-[20px] mb-0.5">
              speed
            </span>
            <span className="text-[11px] text-on-surface font-bold">&lt; 12ms Latency</span>
            <span className="text-[10px] text-outline">Direct WS Pipe</span>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center">
            <span className="material-symbols-outlined material-symbols-filled text-primary text-[20px] mb-0.5">
              eco
            </span>
            <span className="text-[11px] text-on-surface font-bold">Kinetic Living</span>
            <span className="text-[10px] text-outline">Zero-Touch Ops</span>
          </div>
        </div>
      </section>

      {/* Engineering & Design Team Profiles */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-[20px] leading-[28px] text-on-surface font-bold">
              Core Engineering Team
            </h2>
            <p className="text-[12px] font-semibold text-on-surface-variant">
              Built by Hardware &amp; Robotics Software Architects
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold shrink-0">
            3 Contributors
          </span>
        </div>

        {TEAM_MEMBERS.map((member) => (
          <div
            key={member.name}
            className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-kh-card border border-slate-200/60 flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-sm bg-surface-container flex items-center justify-center">
                {!failedAvatars[member.name] ? (
                  <img
                    className="w-full h-full object-cover"
                    alt={`Portrait of ${member.name}`}
                    src={member.avatar}
                    onError={() =>
                      setFailedAvatars((prev) => ({ ...prev, [member.name]: true }))
                    }
                  />
                ) : (
                  <span className="text-[16px] font-extrabold text-primary">{member.initials}</span>
                )}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary-container ring-2 ring-surface-container-lowest" />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px] text-on-surface truncate font-bold">{member.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${member.badgeClass}`}
                  >
                    {member.badge}
                  </span>
                </div>
                <span className="text-[12px] text-primary font-semibold truncate">
                  {member.role}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {member.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {member.links.map((link) => (
                  <button
                    key={link.title}
                    type="button"
                    onClick={() => onNotify(`${member.name} — ${link.title}`)}
                    title={link.title}
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* System Architecture & Tech Stack Grid */}
      <section className="flex flex-col gap-2.5">
        <div className="px-1 flex items-center justify-between">
          <h2 className="text-[20px] leading-[28px] text-on-surface font-bold">Architecture</h2>
          <span className="text-[11px] font-semibold text-on-surface-variant">v1.0 Stack</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {STACK_ITEMS.map((item) => (
            <div
              key={item.title}
              className="bg-surface-container-lowest p-3.5 rounded-2xl shadow-kh-card border border-slate-200/60 flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] text-on-surface font-bold truncate">{item.title}</span>
                <span className="text-[11px] text-outline truncate">{item.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open Source, Documentation & Repos */}
      <section className="flex flex-col gap-2">
        <div className="px-1">
          <h2 className="text-[20px] leading-[28px] text-on-surface font-bold">Resources</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onNotify('Kenny Robotics Repository — v1.0.0')}
            className="min-h-[50px] px-4 py-3 rounded-full bg-primary-container hover:bg-primary text-on-primary text-[15px] font-semibold flex items-center justify-center gap-1.5 shadow-kh-cta active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">code</span>
            <span>Repository</span>
          </button>
          <button
            type="button"
            onClick={() => onNotify('Kinetic Habitat SLAM Whitepaper')}
            className="min-h-[50px] px-4 py-3 rounded-full bg-surface-container-lowest text-on-surface text-[15px] font-semibold flex items-center justify-center gap-1.5 shadow-kh-card border border-slate-200/60 hover:bg-surface-container active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span>Whitepaper</span>
          </button>
        </div>
      </section>

      {/* Build Telemetry Meta Footer */}
      <footer className="pt-1 flex flex-col items-center justify-center gap-1 text-center">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-container" />
          <span className="text-[11px] text-on-surface font-bold">Firmware Hash: 49e2cf7</span>
          <span className="text-outline">•</span>
          <span className="text-[11px] text-outline font-semibold">ROS 2 Humble</span>
        </div>
        <p className="text-[11px] text-outline">
          Designed with kinetic precision for smart domestic spaces • 2025
        </p>
      </footer>
    </div>
  );
}
