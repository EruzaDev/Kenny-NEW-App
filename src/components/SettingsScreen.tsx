import { useRef, useState } from 'react';
import { getApiBase, setApiBase } from '../lib/api';
import type { KennyState, SavedMap } from '../types';

interface SettingsScreenProps {
  connected: boolean;
  state: KennyState | null;
  map: SavedMap | null;
  latencyMs: number | null;
  onApiBaseChanged: () => void;
  onResync: () => void;
  onUploadMapFile: (file: File, widthMeters: number, heightMeters: number) => void;
  onNotify: (msg: string) => void;
}

type Protocol = 'WSS' | 'MQTT' | 'REST';
type LogFilter = 'all' | 'api' | 'raw' | 'errors';

interface DebugFrame {
  id: string;
  time: string;
  category: 'api' | 'raw' | 'errors';
  tag: string;
  detail: string;
  colorClass: string;
}

function nowTimeStr(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

export function SettingsScreen({
  connected,
  state,
  map,
  latencyMs,
  onApiBaseChanged,
  onResync,
  onUploadMapFile,
  onNotify,
}: SettingsScreenProps) {
  const [protocol, setProtocol] = useState<Protocol>('WSS');
  const [apiUrl, setApiUrl] = useState<string>(() => getApiBase());
  const [showToken, setShowToken] = useState(false);
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [pingMs, setPingMs] = useState<number>(latencyMs ?? 18);
  const [customFrames, setCustomFrames] = useState<DebugFrame[]>([
    {
      id: 'init-f1',
      time: '14:22:01',
      category: 'api',
      tag: 'REST',
      detail: 'GET /telemetry/pose -> 200 OK',
      colorClass: 'text-primary-fixed',
    },
    {
      id: 'init-f2',
      time: '14:22:02',
      category: 'raw',
      tag: 'WS_OUT',
      detail: `HEARTBEAT { battery: ${state?.battery ?? 88} }`,
      colorClass: 'text-surface-container-high',
    },
    {
      id: 'init-f3',
      time: '14:22:02',
      category: 'raw',
      tag: 'WS_IN',
      detail: 'ACK_PONG { rssi: -48dBm }',
      colorClass: 'text-primary-fixed-dim',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const authToken = 'kny_live_89f02931a7bc882e88a09cfb';

  const appendFrame = (
    category: 'api' | 'raw' | 'errors',
    tag: string,
    detail: string,
    colorClass: string
  ) => {
    setCustomFrames((prev) =>
      [
        ...prev,
        {
          id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          time: nowTimeStr(),
          category,
          tag,
          detail,
          colorClass,
        },
      ].slice(-40)
    );
  };

  // Merge real Kenny syncLog entries with interactive diagnostic frames
  const syncFrames: DebugFrame[] = (state?.syncLog ?? []).slice(0, 8).map((entry) => ({
    id: entry.id,
    time: new Date(entry.timestamp).toTimeString().split(' ')[0],
    category: entry.status === 'warn' ? 'errors' : entry.direction === 'robot' ? 'raw' : 'api',
    tag: entry.direction === 'outbound' ? 'POST' : entry.direction === 'robot' ? 'SSE' : 'REST',
    detail: `${entry.title} — ${entry.detail}`,
    colorClass:
      entry.status === 'warn'
        ? 'text-secondary-fixed-dim'
        : entry.direction === 'robot'
          ? 'text-primary-fixed-dim'
          : 'text-primary-fixed',
  }));

  const allFrames = [...syncFrames.reverse(), ...customFrames];
  const visibleFrames =
    logFilter === 'all' ? allFrames : allFrames.filter((f) => f.category === logFilter);

  const handlePing = async () => {
    const seq = Math.floor(Math.random() * 9000 + 1000);
    appendFrame('raw', 'WS_OUT', `ECHO_TEST { seq: ${seq} }`, 'text-surface-container-high');
    const t0 = performance.now();
    try {
      const res = await fetch(`${getApiBase()}/health`);
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      if (res.ok) {
        setPingMs(elapsed);
        appendFrame(
          'raw',
          'WS_IN',
          `ACK_ECHO { latency: ${elapsed}ms, status: 200 OK }`,
          'text-primary-fixed-dim'
        );
        onNotify(`Heartbeat Echo: ${elapsed}ms`);
        return;
      }
      throw new Error('Non-200 health response');
    } catch {
      appendFrame(
        'errors',
        'NET',
        'API unreachable — local offline simulation active',
        'text-secondary-fixed-dim'
      );
      onNotify('Offline mode — local simulator ready');
    }
  };

  const handleSaveApiUrl = () => {
    setApiBase(apiUrl);
    onApiBaseChanged();
    appendFrame('api', 'CFG', `Base API URL updated -> ${getApiBase()}`, 'text-primary-fixed');
    onNotify('API endpoint saved & reconnecting');
  };

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    onNotify(`${label} copied to clipboard`);
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(allFrames, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kenny-debug-logs.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Exported kenny-debug-logs.json');
  };

  const handleReconnect = () => {
    appendFrame('api', 'SYS', 'Re-establishing SSE & REST bridge...', 'text-secondary-fixed-dim');
    onResync();
    onApiBaseChanged();
    onNotify('Reconnecting to Kenny API…');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadMapFile(file, map?.widthMeters ?? 16, map?.heightMeters ?? 12);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-margin gap-4">
      {/* Ultra-minimalist Header */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[24px] leading-[32px] font-bold text-on-surface">Diagnostics</h1>
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-primary animate-pulse' : 'bg-secondary-container'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handlePing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all active:scale-95 text-[12px] font-bold shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>Ping</span>
        </button>
      </div>

      {/* 1. Glanceable Connection Telemetry Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-kh-card border border-slate-200/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">sensors</span>
            <span className="text-[16px] text-on-surface font-bold">Connection</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-mono">
            <span className="text-primary font-bold">{connected ? `${pingMs}ms` : 'LOCAL'}</span>
            <span className="text-outline">•</span>
            <span className="text-on-surface-variant">{connected ? '-48 dBm' : 'Offline'}</span>
          </div>
        </div>

        {/* Clean 3-Node Status Row */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {[
            { label: 'Socket', ok: connected },
            { label: 'REST', ok: connected },
            { label: 'MCU', ok: connected || Boolean(state) },
          ].map((node) => (
            <div
              key={node.label}
              className="bg-surface-container-low rounded-lg py-2 px-2.5 flex items-center justify-center gap-1.5"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  node.ok ? 'bg-primary' : 'bg-secondary-container'
                }`}
              />
              <span className="text-[11px] text-on-surface font-semibold">{node.label}</span>
            </div>
          ))}
        </div>

        {/* Compact Hardware Metadata Strip */}
        <div className="bg-surface-container-high/45 rounded-lg px-3 py-2 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant">Active Map</span>
            <span className="font-mono text-on-surface font-bold truncate max-w-[190px]">
              {map?.name ?? 'Kenny_Home_Floor1.yaml'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant">Firmware Build</span>
            <span className="font-mono text-primary font-bold">v2.4.1-debug (kinetic-rc3)</span>
          </div>
        </div>
      </div>

      {/* 2. Gateway Configuration */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-kh-card border border-slate-200/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[16px] text-on-surface font-bold">Gateway</span>
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-full gap-0.5">
            {(['WSS', 'MQTT', 'REST'] as Protocol[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setProtocol(p);
                  onNotify(`Protocol set to ${p}`);
                }}
                className={`py-1 px-2.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  protocol === p
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Base Robot API URL Field */}
        <div className="flex items-center bg-surface-container-low rounded-lg px-3 py-2 gap-2">
          <span className="material-symbols-outlined text-outline text-[18px]">link</span>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            onBlur={handleSaveApiUrl}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveApiUrl();
            }}
            aria-label="Base Robot API URL"
            placeholder="/api or http://192.168.1.145:3001/api"
            className="bg-transparent font-mono text-[13px] text-on-surface w-full focus:outline-none truncate"
          />
          <button
            type="button"
            onClick={handleSaveApiUrl}
            title="Apply API URL"
            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 cursor-pointer shrink-0"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => handleCopy(apiUrl, 'API URL')}
            title="Copy URL"
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
        </div>

        {/* Bearer Token Field */}
        <div className="flex items-center bg-surface-container-low rounded-lg px-3 py-2 gap-2">
          <span className="material-symbols-outlined text-outline text-[18px]">key</span>
          <input
            type={showToken ? 'text' : 'password'}
            readOnly
            value={authToken}
            aria-label="Bearer Auth Token"
            className="bg-transparent font-mono text-[13px] text-on-surface w-full focus:outline-none truncate"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            title="Show/Hide Token"
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showToken ? 'visibility_off' : 'visibility'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleCopy(authToken, 'Bearer token')}
            title="Copy Token"
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
        </div>

        {/* Upload Custom SLAM Map Row */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[12px] font-semibold text-on-surface-variant">
            Custom SLAM Map Image
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-[11px] font-bold hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-primary">upload_file</span>
            <span>Upload Map</span>
          </button>
        </div>
      </div>

      {/* 3. Live Stream & Frame Inspector */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-kh-card border border-slate-200/60 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] text-on-surface font-bold">Live Stream</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'api', label: 'API' },
                { id: 'raw', label: 'Sensor' },
                { id: 'errors', label: 'Error' },
              ] as Array<{ id: LogFilter; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLogFilter(f.id)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all cursor-pointer ${
                  logFilter === f.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCustomFrames([]);
                onNotify('Log buffer flushed');
              }}
              title="Clear local frames"
              className="p-1 rounded hover:bg-surface-container text-on-surface-variant ml-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
            </button>
          </div>
        </div>

        {/* Compact Terminal Window */}
        <div className="bg-on-background rounded-xl p-2.5 h-40 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5 shadow-inner">
          {visibleFrames.length === 0 ? (
            <div className="text-outline text-center my-auto">No frames matching filter</div>
          ) : (
            visibleFrames.map((frame) => (
              <div
                key={frame.id}
                className={`flex items-center gap-1.5 ${frame.colorClass} truncate`}
              >
                <span className="text-outline shrink-0">{frame.time}</span>
                <span className="font-bold shrink-0">{frame.tag}</span>
                <span className="text-inverse-on-surface truncate">{frame.detail}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Ultra-minimalist Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handlePing}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-surface-container-lowest text-on-surface shadow-kh-card border border-slate-200/60 hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-primary text-[18px]">network_ping</span>
          <span className="text-[12px] font-bold">Ping</span>
        </button>
        <button
          type="button"
          onClick={handleExportLogs}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-surface-container-lowest text-on-surface shadow-kh-card border border-slate-200/60 hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-secondary text-[18px]">file_download</span>
          <span className="text-[12px] font-bold">Export</span>
        </button>
        <button
          type="button"
          onClick={handleReconnect}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-surface-container-high text-on-surface shadow-sm hover:bg-surface-container-highest active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-primary text-[18px]">sync</span>
          <span className="text-[12px] font-bold">Reconnect</span>
        </button>
      </div>
    </div>
  );
}
