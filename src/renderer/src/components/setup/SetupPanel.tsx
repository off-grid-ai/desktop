import { useEffect, useRef, useState } from 'react';
import { MagicWand, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@renderer/lib/utils';
import { HealthPanel } from './HealthPanel';

interface SetupProgress {
  phase: 'select' | 'download' | 'activate' | 'start' | 'verify' | 'done' | 'error';
  message: string;
  modelName?: string;
  percent?: number;
  downloadedMB?: string;
  totalMB?: string;
}

interface SetupPanelProps {
  /** Called once auto-configure finishes successfully (e.g. to dismiss a gate). */
  onConfigured?: () => void;
  /** Hide the embedded health panel (e.g. on the first-run gate). */
  hideHealth?: boolean;
}

/** The reusable setup surface: a one-click "Configure for me", a link to browse
 *  all models manually, and (optionally) the live health panel. Used both on the
 *  first-run gate and in Settings. */
export function SetupPanel({ onConfigured, hideHealth }: SetupPanelProps): React.ReactElement {
  const api = (window as { api?: Record<string, (...args: unknown[]) => Promise<unknown>> }).api;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const firedConfigured = useRef(false);

  // Subscribe to setup progress for the whole component lifetime.
  useEffect(() => {
    const off = (api as unknown as { onSetupProgress?: (cb: (p: SetupProgress) => void) => () => void })
      ?.onSetupProgress?.((p) => {
        setProgress(p);
        if (p.phase === 'done' || p.phase === 'error') setRunning(false);
        if (p.phase === 'done' && !firedConfigured.current) {
          firedConfigured.current = true;
          onConfigured?.();
        }
      });
    return () => off?.();
  }, [api, onConfigured]);

  const configure = async (): Promise<void> => {
    if (running) return;
    firedConfigured.current = false;
    setRunning(true);
    setProgress({ phase: 'select', message: 'Picking a model that fits your Mac…' });
    try {
      await api?.autoConfigure?.();
    } catch (e) {
      setProgress({ phase: 'error', message: (e as Error)?.message ?? 'Setup failed.' });
      setRunning(false);
    }
  };

  const done = progress?.phase === 'done';
  const errored = progress?.phase === 'error';
  const pct = typeof progress?.percent === 'number' ? progress.percent : null;

  return (
    <div className="space-y-4 font-mono">
      {/* Configure for me — the one-click path */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-800/60">
            <MagicWand className="h-5 w-5 text-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white">Configure it for me</div>
            <div className="text-xs text-neutral-500">
              Picks the best model for your Mac, downloads it, and starts everything — one click.
            </div>
          </div>
          <button
            onClick={configure}
            disabled={running}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-colors',
              'bg-green-600 text-white hover:bg-green-500',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {running ? 'Setting up…' : done ? 'Run again' : 'Configure'}
          </button>
        </div>

        {/* Progress / result */}
        {progress && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-xs">
              {done && <CheckCircle weight="fill" className="h-4 w-4 text-green-500" />}
              {errored && <WarningCircle weight="fill" className="h-4 w-4 text-red-500" />}
              <span className={cn(done ? 'text-green-500' : errored ? 'text-red-500' : 'text-neutral-400')}>
                {progress.message}
              </span>
            </div>
            {running && progress.phase === 'download' && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-neutral-600">
                  {pct ?? 0}%{progress.totalMB ? ` · ${progress.downloadedMB ?? '0'} / ${progress.totalMB} MB` : ''}
                </div>
              </div>
            )}
            {running && progress.phase !== 'download' && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-green-500/60" />
              </div>
            )}
          </div>
        )}
      </div>

      {!hideHealth && <HealthPanel />}
    </div>
  );
}
