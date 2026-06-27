import { useCallback, useEffect, useState } from 'react';
import { HardDrives, Trash, ArrowsClockwise, X, Broom } from '@phosphor-icons/react';
import { cn } from '@renderer/lib/utils';

interface ModelDiskEntry { id: string; name: string; kind?: string; bytes: number; active: boolean }
interface StorageInfo {
  dir: string;
  totalBytes: number;
  freeBytes: number;
  models: ModelDiskEntry[];
  orphans: { name: string; bytes: number }[];
}
interface DownloadEntry {
  modelId: string;
  percent?: number;
  status?: 'downloading' | 'completed' | 'failed' | 'cancelled';
  downloadedMB?: string;
  totalMB?: string;
  error?: string;
}

function gb(bytes: number): string {
  if (!bytes) return '0 GB';
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e9).toFixed(1)} GB`;
}

/** Disk usage for downloaded models, orphan cleanup, and a download manager
 *  (active / failed / interrupted downloads with retry + cancel). */
export function StoragePanel(): React.ReactElement {
  const api = (window as { api?: Record<string, (...args: unknown[]) => Promise<unknown>> }).api;
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([api?.getStorageInfo?.(), api?.listDownloads?.()]);
      if (s) setInfo(s as StorageInfo);
      if (Array.isArray(d)) setDownloads(d as DownloadEntry[]);
    } catch { /* keep last */ }
  }, [api]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    const off = (api as unknown as { onModelProgress?: (cb: () => void) => () => void })?.onModelProgress?.(refresh);
    return () => { clearInterval(t); off?.(); };
  }, [refresh, api]);

  const del = async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`Delete "${name}"? This removes its files from disk.`)) return;
    setBusy(id);
    try { await api?.deleteModel?.(id); await refresh(); } finally { setBusy(null); }
  };
  const cleanOrphans = async (): Promise<void> => {
    setBusy('orphans');
    try { await api?.deleteOrphans?.(); await refresh(); } finally { setBusy(null); }
  };
  const retry = async (id: string): Promise<void> => {
    setBusy(id);
    try { await api?.retryDownload?.(id); await refresh(); } finally { setBusy(null); }
  };
  const cancel = async (id: string): Promise<void> => {
    setBusy(id);
    try { await api?.cancelModelDownload?.(id); await refresh(); } finally { setBusy(null); }
  };

  const active = downloads.filter((d) => d.status === 'downloading');
  const incomplete = downloads.filter((d) => d.status === 'failed' || d.status === 'cancelled');
  const orphanBytes = (info?.orphans ?? []).reduce((s, o) => s + o.bytes, 0);
  const usedFrac = info && info.totalBytes + info.freeBytes > 0
    ? info.totalBytes / (info.totalBytes + info.freeBytes)
    : 0;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 font-mono">
      <div className="flex items-center justify-between border-b border-neutral-800/60 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
          <HardDrives className="h-3.5 w-3.5" /> Storage
        </div>
        <button onClick={refresh} className="flex items-center gap-1.5 text-[11px] text-neutral-500 transition-colors hover:text-white">
          <ArrowsClockwise className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Usage summary */}
      <div className="px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-neutral-400">{info ? `${gb(info.totalBytes)} used by models` : 'Reading…'}</span>
          {info && <span className="text-neutral-600">{gb(info.freeBytes)} free</span>}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, Math.round(usedFrac * 100))}%` }} />
        </div>
      </div>

      {/* Active + interrupted downloads */}
      {(active.length > 0 || incomplete.length > 0) && (
        <div className="border-t border-neutral-800/40 px-4 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-neutral-600">Downloads</div>
          {active.map((d) => (
            <div key={d.modelId} className="flex items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px] text-neutral-300">{d.modelId}</div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${d.percent ?? 0}%` }} />
                </div>
              </div>
              <span className="font-mono text-[10px] text-neutral-500">{d.percent ?? 0}%</span>
              <button onClick={() => cancel(d.modelId)} className="rounded-md p-1 text-neutral-500 hover:text-white" aria-label="Cancel">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {incomplete.map((d) => (
            <div key={d.modelId} className="flex items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[11px] text-neutral-300">{d.modelId}</div>
                <div className="truncate text-[10px] text-neutral-500">{d.error ?? d.status}</div>
              </div>
              <button
                onClick={() => retry(d.modelId)}
                disabled={busy === d.modelId}
                className="rounded-md border border-neutral-700 px-2 py-1 text-[10px] text-neutral-300 hover:border-green-500/60 hover:text-white disabled:opacity-50"
              >
                {busy === d.modelId ? '…' : 'Retry'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Installed models */}
      <div className="divide-y divide-neutral-800/40 border-t border-neutral-800/40">
        {(info?.models ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-xs text-neutral-200">
                {m.name}{m.active && <span className="ml-2 text-[10px] text-green-500">active</span>}
              </div>
              {m.kind && <div className="text-[10px] text-neutral-600">{m.kind}</div>}
            </div>
            <span className="font-mono text-[11px] text-neutral-500">{gb(m.bytes)}</span>
            <button
              onClick={() => del(m.id, m.name)}
              disabled={busy === m.id || m.active}
              aria-label={`Delete ${m.name}`}
              title={m.active ? 'Deactivate before deleting the active model' : 'Delete'}
              className="rounded-md p-1 text-neutral-500 transition-colors hover:text-red-400 disabled:opacity-30"
            >
              <Trash className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {info && info.models.length === 0 && (
          <div className="px-4 py-4 text-center text-xs text-neutral-600">No models installed yet.</div>
        )}
      </div>

      {/* Orphan cleanup */}
      {info && info.orphans.length > 0 && (
        <div className="flex items-center justify-between border-t border-neutral-800/60 px-4 py-2.5">
          <span className="text-[11px] text-neutral-500">
            {info.orphans.length} unused file{info.orphans.length > 1 ? 's' : ''} · {gb(orphanBytes)}
          </span>
          <button
            onClick={cleanOrphans}
            disabled={busy === 'orphans'}
            className={cn('flex items-center gap-1.5 rounded-md border border-neutral-700 px-2.5 py-1 text-[10px] text-neutral-300', 'transition-colors hover:border-green-500/60 hover:text-white disabled:opacity-50')}
          >
            <Broom className="h-3 w-3" /> {busy === 'orphans' ? 'Cleaning…' : 'Clean up'}
          </button>
        </div>
      )}
    </div>
  );
}
