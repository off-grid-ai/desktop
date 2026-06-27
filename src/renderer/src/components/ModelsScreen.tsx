import { useEffect, useRef, useState } from 'react';
import {
  IconDownload,
  IconCircleCheck,
  IconLoader2,
  IconSearch,
  IconChevronDown,
  IconCheck,
  IconX,
  IconTrash,
  IconUpload,
  IconInfoCircle,
  IconExternalLink,
  IconEye,
} from '@tabler/icons-react';
import { StoragePanel } from './setup/StoragePanel';
import {
  filterAndSort,
  parseParamCount,
  CREDIBILITY_OPTIONS,
  SIZE_OPTIONS,
  SORT_OPTIONS,
  CREDIBILITY_LABELS,
  determineCredibility,
  hasActiveFilters,
  initialFilterState,
  type FilterState,
  type Credibility,
} from '@offgrid/models';

// Compact filter/sort dropdown styled to the Off Grid terminal look. Custom
// (not a native <select>) so the popup, chevron, and selection state all match
// the brutalist palette; the prefix (e.g. "Sort: ") shows only on the trigger.
function Sel({
  value,
  onChange,
  options,
  allLabel,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { key: string; label: string }[];
  allLabel?: string;
  prefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = allLabel ? [{ key: 'all', label: allLabel }, ...options] : [...options];
  const current = items.find((o) => o.key === value) ?? items[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-sm border bg-neutral-900/60 px-2.5 py-1.5 text-[11px] transition-colors ${
          open ? 'border-green-500 text-white' : 'border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white'
        }`}
      >
        <span>
          {prefix ?? ''}
          {current?.label}
        </span>
        <IconChevronDown
          className={`h-3 w-3 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 min-w-[170px] overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950 py-1 shadow-xl">
          {items.map((o) => {
            const active = o.key === value;
            return (
              <button
                key={o.key}
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-neutral-900 ${
                  active ? 'text-green-500' : 'text-neutral-300'
                }`}
              >
                <IconCheck className={`h-3 w-3 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ModelFile { name: string; url: string; sizeBytes?: number }
interface ModelEntry {
  id: string;
  name: string;
  kind: string;
  org?: string;
  description?: string;
  params?: number;
  minRamGb?: number;
  isNew?: boolean;
  files: ModelFile[];
  imageModes?: string[];
  tags?: string[];
  releaseDate?: string;
  quant?: string;
}

// Use-case guidance for chat models. Client-side (no catalog schema change): each
// maps to a one-line blurb + a heuristic filter so people can find a model suited
// to coding / legal / medical / vision / etc.
interface UseCase { id: string; label: string; blurb: string; match: (m: { params?: number; kind?: string }) => boolean }
const USE_CASES: UseCase[] = [
  { id: 'all', label: 'All', blurb: '', match: () => true },
  { id: 'general', label: 'General chat', blurb: 'Everyday questions, drafting, and brainstorming.', match: () => true },
  { id: 'coding', label: 'Coding', blurb: 'Code generation and debugging — larger models reason better over code.', match: (m) => (m.params ?? 0) >= 4 },
  { id: 'writing', label: 'Writing', blurb: 'Long-form drafting and editing — long context helps.', match: (m) => (m.params ?? 0) >= 2 },
  { id: 'legal', label: 'Legal & long docs', blurb: 'Dense documents and careful reasoning — favor larger models. On-device, so nothing leaves your machine.', match: (m) => (m.params ?? 0) >= 7 },
  { id: 'medical', label: 'Medical', blurb: 'Careful reasoning over clinical text — kept fully private on-device. Not a substitute for professional medical advice.', match: (m) => (m.params ?? 0) >= 7 },
  { id: 'vision', label: 'Vision', blurb: 'Understand images, screenshots, and documents.', match: (m) => m.kind === 'vision' },
  { id: 'lightweight', label: 'Lightweight', blurb: 'Fast and low-memory for modest machines.', match: (m) => (m.params ?? 0) <= 4 },
];

// "Mar 2026" from an ISO date; '' if absent/unparseable.
function fmtReleaseDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Catalog featuring order: Off Grid flagship builds (RealVisXL / Juggernaut /
// DreamShaper) first, then the rest of the Off Grid builds, then everyone else.
function featureRank(m: { id?: string; credibility?: string }): number {
  if (m.credibility !== 'offgrid') return 2;
  return /realvis|juggernaut|dreamshaper/i.test(m.id || '') ? 0 : 1;
}

const MODE_LABELS: Record<string, string> = {
  txt2img: 'Text -> Image',
  img2img: 'Image -> Image',
};

const KIND_LABELS: Record<string, string> = {
  text: 'Text',
  vision: 'Vision',
  image: 'Image',
  voice: 'Voice',
  transcription: 'Transcription',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api;

export function ModelsScreen() {
  const [kinds, setKinds] = useState<string[]>([]);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [installed, setInstalled] = useState<string[]>([]);
  const [activeKind, setActiveKind] = useState<string>('text');
  const [progress, setProgress] = useState<Record<string, { percent: number; status?: string }>>({});
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [ramGb, setRamGb] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [useCase, setUseCase] = useState('all');
  const [detail, setDetail] = useState<ModelEntry | null>(null);

  const importModel = async (): Promise<void> => {
    if (importing) return;
    setImporting(true);
    try {
      const res = await api.importLocalModel?.();
      if (res?.success) {
        const c = await api.getModelCatalog?.();
        if (c) { setKinds(c.kinds); setModels(c.models); }
        setInstalled(await api.getInstalledModels?.());
        setActiveKind('text');
      } else if (res && !res.canceled && res.error) {
        window.alert(`Import failed: ${res.error}`);
      }
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    api.systemHealth?.().then((h: { ramGb?: number }) => setRamGb(h?.ramGb ?? null)).catch(() => {});
    api.getModelCatalog?.().then((c: { kinds: string[]; models: ModelEntry[] }) => {
      setKinds(c.kinds);
      setModels(c.models);
      if (c.kinds[0]) setActiveKind(c.kinds[0]);
    });
    api.getInstalledModels?.().then(setInstalled);
    api.getActiveModel?.().then(setActiveModel);
    const off = api.onModelProgress?.((d: { modelId: string; percent?: number; status?: string }) => {
      // Cancelled: drop the row's progress so it reverts to a Download button.
      if (d.status === 'cancelled') {
        setProgress((p) => { const { [d.modelId]: _drop, ...rest } = p; return rest; });
        return;
      }
      setProgress((p) => ({
        ...p,
        [d.modelId]: { percent: d.percent ?? p[d.modelId]?.percent ?? 0, status: d.status },
      }));
      if (d.status === 'completed') api.getInstalledModels?.().then(setInstalled);
    });
    return off;
  }, []);

  const cancelDownload = (id: string): void => {
    void api.cancelModelDownload?.(id);
    setProgress((p) => { const { [id]: _drop, ...rest } = p; return rest; });
  };

  const download = (id: string): void => {
    setProgress((p) => ({ ...p, [id]: { percent: 0, status: 'downloading' } }));
    api.downloadModel?.(id);
  };

  const [deleting, setDeleting] = useState<string | null>(null);
  const removeModel = async (id: string, label: string): Promise<void> => {
    if (!window.confirm(`Delete "${label}"? This removes its files from disk.`)) return;
    setDeleting(id);
    try {
      await api.deleteModel?.(id);
      setInstalled(await api.getInstalledModels?.());
      setActiveModel(await api.getActiveModel?.());
    } finally {
      setDeleting(null);
    }
  };

  const useModel = async (id: string): Promise<void> => {
    if (switching) return;
    // Pre-activate RAM check: warn before loading a model that's large for this Mac.
    try {
      const fit = await api.estimateModelFit?.(id);
      if (fit && fit.level !== 'ok') {
        const ok = window.confirm(`${fit.message}\n\nLoad it anyway?`);
        if (!ok) return;
      }
    } catch { /* estimate is best-effort — proceed */ }
    setSwitchError(null);
    setSwitching(id);
    try {
      const res = await api.setActiveModel?.(id);
      if (res?.success) setActiveModel(id);
      else setSwitchError(res?.error ? `Couldn't switch: ${res.error}` : "Couldn't switch model");
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Couldn't switch model");
    } finally {
      setSwitching(null);
    }
  };

  // Hugging Face search (debounced).
  const [query, setQuery] = useState('');
  const [hfResults, setHfResults] = useState<
    { id: string; name: string; org: string; downloads?: number; likes?: number; lastModified?: string; credibility?: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  // Download-size buckets (GB ceiling) — the headline filter: "what runs on my
  // machine". null = all sizes. Filters by total download bytes of the model.
  const [sizeBucket, setSizeBucket] = useState<number | null>(null);
  const SIZE_BUCKETS = [2, 4, 6, 8, 16] as const;
  const totalBytes = (m: { files?: { sizeBytes?: number }[] }): number =>
    (m.files || []).reduce((s, f) => s + (f.sizeBytes || 0), 0);
  useEffect(() => {
    const q = query.trim();
    // STT/TTS are curated-only — never hit HF for them.
    const canSearch = activeKind !== 'voice' && activeKind !== 'transcription';
    if (!canSearch || q.length < 2) {
      setHfResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      // Scope the search to the focused tab's modality (text/vision/image/stt/tts).
      const res = await api.searchModels?.(q, activeKind);
      setHfResults(res ?? []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query, activeKind]);

  // HF free-search is only meaningful where arbitrary HF repos run on our
  // runtimes: text/vision/image (GGUF / sd.cpp). STT (whisper ggml) and TTS
  // (Kokoro/Piper onnx) are curated-catalogue only — most HF ASR/TTS repos are
  // incompatible formats, so a free search would mostly surface undownloadables.
  const searchEnabled = activeKind !== 'voice' && activeKind !== 'transcription';
  // Vision models also do text, so surface them under the Text tab too.
  const list = models.filter((m) => m.kind === activeKind || (activeKind === 'text' && m.kind === 'vision'));
  const searchingMode = searchEnabled && query.trim().length >= 2;

  // Map HF results into FilterableModel, then apply the shared filter/sort.
  const displayed = filterAndSort(
    hfResults.map((r) => ({
      id: r.id,
      name: r.name,
      org: r.org,
      downloads: r.downloads,
      likes: r.likes,
      lastModified: r.lastModified,
      credibility: r.credibility as Credibility | undefined,
      params: parseParamCount(r.name) ?? parseParamCount(r.id),
    })),
    filterState
  );

  // The curated catalog (current kind tab) runs through the same filter/sort so
  // the bar is meaningful in browse mode too. filterAndSort is generic, so the
  // full ModelEntry (description / imageModes / install state) is preserved.
  const displayedCatalog = filterAndSort(
    list.map((m) => ({
      ...m,
      org: m.org ?? '',
      params: m.params ?? parseParamCount(m.name) ?? undefined,
      // Credibility from the HF author (id prefix), not the display org — so
      // offgrid-ai -> Off Grid, unsloth -> Verified, google -> Official, etc.
      credibility: determineCredibility((m.id || '').split('/')[0]),
    })),
    filterState
  )
    .filter((m) => sizeBucket == null || totalBytes(m) <= sizeBucket * 1e9)
    // Use-case filter (chat models only) — coding/legal/medical/vision/etc.
    .filter((m) => activeKind !== 'text' || (USE_CASES.find((u) => u.id === useCase)?.match(m) ?? true))
    // Featuring order: Off Grid's flagship photoreal/versatile builds first, then
    // the rest of the Off Grid builds, then everyone else. Stable sort preserves
    // catalog order within each tier.
    .sort((a, b) => featureRank(a) - featureRank(b));

  const resultCount = searchingMode ? displayed.length : displayedCatalog.length;

  return (
    <div className="h-full overflow-y-auto px-8 py-6 font-mono">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-light tracking-tight text-white">Models</h1>
        <button
          onClick={importModel}
          disabled={importing}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-green-500 hover:text-green-500 disabled:opacity-50"
        >
          {importing ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconUpload className="h-3.5 w-3.5" />}
          {importing ? 'Importing…' : 'Import .gguf'}
        </button>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Download models for any capability, or import your own .gguf. Everything runs locally on your device.
      </p>
      {ramGb && (
        <p className="mt-1 text-xs text-neutral-600">
          Your Mac has {ramGb} GB RAM — models up to ~{Math.round(ramGb * 0.38)} GB load with comfortable headroom.
        </p>
      )}

      {/* Modality tabs. Vision is merged into Text (vision models also do text and
          carry a "Vision" badge), so the standalone Vision tab is hidden. */}
      <div className="mt-5 flex gap-2 border-b border-neutral-800 pb-px">
        {kinds.filter((k) => k !== 'vision').map((k) => (
          <button
            key={k}
            onClick={() => setActiveKind(k)}
            className={`px-3 py-2 text-xs uppercase tracking-wide transition-colors ${
              activeKind === k
                ? 'border-b-2 border-green-500 text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {KIND_LABELS[k] ?? k}
          </button>
        ))}
      </div>

      {/* Use-case chips (chat models only): coding / legal / medical / vision / … */}
      {activeKind === 'text' && !searchingMode && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-widest text-neutral-600">For</span>
            {USE_CASES.filter((u) => u.id !== 'all').map((u) => (
              <button
                key={u.id}
                onClick={() => setUseCase((cur) => (cur === u.id ? 'all' : u.id))}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  useCase === u.id ? 'border-green-500 text-green-500' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          {useCase !== 'all' && (
            <p className="mt-2 text-xs text-neutral-500">{USE_CASES.find((u) => u.id === useCase)?.blurb}</p>
          )}
        </div>
      )}

      {/* Hugging Face search — text/vision/image only (those run arbitrary HF
          repos). STT/TTS are curated, since most HF ASR/TTS repos are formats our
          runtimes can't load. */}
      {searchEnabled ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
          <IconSearch className="h-4 w-4 shrink-0 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search Hugging Face for ${(KIND_LABELS[activeKind] ?? activeKind).toLowerCase()} models...`}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-600 outline-none"
          />
          {searching && <IconLoader2 className="h-4 w-4 animate-spin text-neutral-500" />}
        </div>
      ) : (
        <p className="mt-4 text-xs text-neutral-600">
          Curated {(KIND_LABELS[activeKind] ?? activeKind).toLowerCase()} models — verified to run on-device.
        </p>
      )}

      {switchError && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {switchError}
        </div>
      )}

      {/* Size buckets — the headline filter: top models that fit your machine. */}
      {!searchingMode && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-neutral-600">Fits in</span>
          {([null, ...SIZE_BUCKETS] as (number | null)[]).map((b) => (
            <button
              key={b ?? 'all'}
              onClick={() => setSizeBucket(b)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] transition-colors ${
                sizeBucket === b
                  ? 'border-green-500 bg-green-500/10 text-green-500'
                  : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
              }`}
            >
              {b == null ? 'All sizes' : `≤ ${b}GB`}
            </button>
          ))}
        </div>
      )}

      {/* Filter + sort bar (shared @offgrid/models options) — always visible.
          The modality tab already scopes the type, so no separate type filter. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Sel
          value={filterState.source}
          onChange={(v) => setFilterState((s) => ({ ...s, source: v as FilterState['source'] }))}
          allLabel="All sources"
          options={CREDIBILITY_OPTIONS}
        />
        <Sel
          value={filterState.size}
          onChange={(v) => setFilterState((s) => ({ ...s, size: v as FilterState['size'] }))}
          allLabel="Any size"
          options={SIZE_OPTIONS}
        />
        <Sel
          value={filterState.sort}
          onChange={(v) => setFilterState((s) => ({ ...s, sort: v as FilterState['sort'] }))}
          options={SORT_OPTIONS}
          prefix="Sort: "
        />
        {hasActiveFilters(filterState) && (
          <button
            onClick={() => setFilterState(initialFilterState)}
            className="rounded-md border border-neutral-800 px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:border-green-500 hover:text-green-500"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-neutral-600">{resultCount} results</span>
      </div>

      {searchingMode ? (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {displayed.length === 0 && !searching && (
            <p className="text-sm text-neutral-500">No {(KIND_LABELS[activeKind] ?? activeKind).toLowerCase()} models found for "{query}".</p>
          )}
          {displayed.map((r) => {
            const prog = progress[r.id];
            const downloading = prog && prog.status !== 'completed' && prog.status !== 'failed';
            const done = prog?.status === 'completed';
            const cred = r.credibility ? CREDIBILITY_LABELS[r.credibility] : undefined;
            return (
              <div key={r.id} className="rounded-md border border-neutral-800 bg-neutral-900/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-white">{r.name}</span>
                      {cred && (
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
                          style={{ color: cred.color, backgroundColor: `${cred.color}1A` }}
                          title={cred.description}
                        >
                          {cred.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-600">
                      {[r.org, r.downloads ? `${r.downloads.toLocaleString()} downloads` : null].filter(Boolean).join('  ·  ')}
                    </div>
                  </div>
                  {done ? (
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-green-500">
                      <IconCircleCheck className="h-4 w-4" /> Downloaded
                    </span>
                  ) : downloading ? (
                    <button
                      onClick={() => cancelDownload(r.id)}
                      title="Cancel download"
                      className="group flex items-center gap-1 whitespace-nowrap rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-red-500 hover:text-red-400"
                    >
                      <IconLoader2 className="h-4 w-4 animate-spin group-hover:hidden" />
                      <IconX className="hidden h-4 w-4 group-hover:block" />
                      <span className="group-hover:hidden">{prog.percent}%</span>
                      <span className="hidden group-hover:inline">Cancel</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => download(r.id)}
                      className="flex items-center gap-1 whitespace-nowrap rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-white transition-colors hover:border-green-500 hover:text-green-500"
                    >
                      <IconDownload className="h-4 w-4" /> Download
                    </button>
                  )}
                </div>
                {downloading && (
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${prog.percent}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {displayedCatalog.length === 0 && (
          <p className="text-sm text-neutral-500">No models match the current filters.</p>
        )}
        {displayedCatalog.map((m) => {
          const isInstalled = installed.includes(m.id);
          const prog = progress[m.id];
          const downloading = prog && prog.status !== 'completed' && prog.status !== 'failed';
          return (
            <div key={m.id} className="rounded-md border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetail(m)}
                      className="truncate text-left text-sm text-white transition-colors hover:text-green-500"
                      title="View details"
                    >
                      {m.name}
                    </button>
                    {m.kind === 'vision' && (
                      <span className="flex items-center gap-0.5 rounded-sm border border-green-500 px-1 text-[9px] uppercase tracking-wide text-green-500">
                        <IconEye className="h-2.5 w-2.5" /> Vision
                      </span>
                    )}
                    {m.isNew && (
                      <span className="rounded-sm border border-green-500 px-1 text-[9px] uppercase tracking-wide text-green-500">
                        New
                      </span>
                    )}
                    <button
                      onClick={() => setDetail(m)}
                      aria-label={`About ${m.name}`}
                      className="text-neutral-600 transition-colors hover:text-neutral-300"
                    >
                      <IconInfoCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-600">
                    {(() => {
                      const bytes = (m.files || []).reduce((s, f) => s + (f.sizeBytes || 0), 0);
                      const size = bytes > 0 ? `${(bytes / 1e9).toFixed(1)}GB download` : null;
                      const released = fmtReleaseDate(m.releaseDate);
                      return [m.org, m.params ? `${m.params}B` : null, size, released].filter(Boolean).join('  ·  ');
                    })()}
                  </div>
                  {(() => {
                    // RAM-fit guide vs this Mac (weights only; KV cache is extra). Only
                    // flag tight/risky so the catalog stays uncluttered. Mirrors the
                    // backend thresholds (≤38% comfy, ≤55% tight, else risky).
                    if (!ramGb) return null;
                    const wGb = (m.files || []).reduce((s, f) => s + (f.sizeBytes || 0), 0) / 1e9;
                    if (!wGb) return null;
                    const level = wGb <= ramGb * 0.38 ? 'ok' : wGb <= ramGb * 0.55 ? 'tight' : 'risky';
                    if (level === 'ok') return null;
                    return (
                      <div className="mt-1.5">
                        <span className={`rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${level === 'tight' ? 'border border-amber-400 text-amber-400' : 'border border-amber-400 bg-amber-400/10 text-amber-400'}`}>
                          {level === 'tight' ? 'Tight on RAM' : 'May not fit'}
                        </span>
                      </div>
                    );
                  })()}
                  {m.tags && m.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className={`rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                            /challenger/i.test(t)
                              ? 'border border-amber-400 bg-amber-400/10 text-amber-400'
                              : /recommend|top quality/i.test(t)
                                ? 'border border-green-500 text-green-500'
                                : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isInstalled ? (
                  <div className="flex items-center gap-2">
                    {m.kind === 'text' || m.kind === 'vision' ? (
                      activeModel === m.id ? (
                        <span className="flex items-center gap-1 whitespace-nowrap text-xs text-green-500">
                          <IconCircleCheck className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => useModel(m.id)}
                          disabled={!!switching}
                          className="flex items-center gap-1 whitespace-nowrap rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-white transition-colors hover:border-green-500 hover:text-green-500 disabled:opacity-50"
                        >
                          {switching === m.id ? <><IconLoader2 className="h-3.5 w-3.5 animate-spin" /> Switching…</> : 'Use'}
                        </button>
                      )
                    ) : (
                      <span className="flex items-center gap-1 whitespace-nowrap text-xs text-green-500">
                        <IconCircleCheck className="h-4 w-4" /> Installed
                      </span>
                    )}
                    <button
                      onClick={() => removeModel(m.id, m.name)}
                      disabled={deleting === m.id}
                      title="Delete model from disk"
                      className="rounded-md border border-neutral-800 p-1.5 text-neutral-500 transition-colors hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      {deleting === m.id ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                    </button>
                  </div>
                ) : downloading ? (
                  <button
                    onClick={() => cancelDownload(m.id)}
                    title="Cancel download"
                    className="group flex items-center gap-1 whitespace-nowrap rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-red-500 hover:text-red-400"
                  >
                    <IconLoader2 className="h-4 w-4 animate-spin group-hover:hidden" />
                    <IconX className="hidden h-4 w-4 group-hover:block" />
                    <span className="group-hover:hidden">{prog.percent}%</span>
                    <span className="hidden group-hover:inline">Cancel</span>
                  </button>
                ) : (
                  <button
                    onClick={() => download(m.id)}
                    className="flex items-center gap-1 whitespace-nowrap rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-white transition-colors hover:border-green-500 hover:text-green-500"
                  >
                    <IconDownload className="h-4 w-4" /> Download
                  </button>
                )}
              </div>
              {m.description && <p className="mt-2 text-xs leading-relaxed text-neutral-400">{m.description}</p>}
              {m.imageModes && m.imageModes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.imageModes.map((mode) => (
                    <span
                      key={mode}
                      className="rounded-sm border border-green-500/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-green-500"
                    >
                      {MODE_LABELS[mode] ?? mode}
                    </span>
                  ))}
                </div>
              )}
              {downloading && (
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${prog.percent}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Storage & download manager: disk usage, in-flight downloads (incl. ones
          started by "Configure for me") with cancel/retry/dismiss, and cleanup. */}
      <div className="mt-10">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-neutral-500">Storage &amp; downloads</h2>
        <StoragePanel />
      </div>

      {/* Model detail — slide-over with full info + Hugging Face link (master-detail). */}
      {detail && (() => {
        const m = detail;
        const isLocal = m.id.startsWith('local:');
        const hfUrl = !isLocal && m.id.includes('/') ? `https://huggingface.co/${m.id}` : null;
        const bytes = (m.files || []).reduce((s, f) => s + (f.sizeBytes || 0), 0);
        const isInstalled = installed.includes(m.id);
        const isActive = activeModel === m.id;
        const prog = progress[m.id];
        const downloading = prog && prog.status !== 'completed' && prog.status !== 'failed';
        const rows: [string, string | null][] = [
          ['Source', m.org || (isLocal ? 'Imported' : '—')],
          ['Parameters', m.params ? `${m.params}B` : null],
          ['Quantization', m.quant || null],
          ['Download size', bytes > 0 ? `${(bytes / 1e9).toFixed(1)} GB` : null],
          ['Released', fmtReleaseDate(m.releaseDate) || null],
          ['Min RAM', m.minRamGb ? `${m.minRamGb} GB` : null],
        ];
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDetail(null)} />
            <div className="relative z-10 flex h-full w-[28vw] min-w-[400px] flex-col border-l border-neutral-800 bg-neutral-950 font-mono">
              <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base text-white">{m.name}</h2>
                    {m.kind === 'vision' && (
                      <span className="flex items-center gap-0.5 rounded-sm border border-green-500 px-1 text-[9px] uppercase tracking-wide text-green-500">
                        <IconEye className="h-2.5 w-2.5" /> Vision
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-neutral-600">{m.id}</div>
                </div>
                <button onClick={() => setDetail(null)} aria-label="Close" className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:text-white">
                  Close
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {m.description && <p className="text-sm leading-relaxed text-neutral-300">{m.description}</p>}
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {rows.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] uppercase tracking-wide text-neutral-600">{k}</dt>
                      <dd className="text-sm text-neutral-200">{v}</dd>
                    </div>
                  ))}
                </dl>
                {ramGb && bytes > 0 && (
                  <p className="mt-4 text-xs text-neutral-500">
                    {bytes / 1e9 <= ramGb * 0.38
                      ? 'Loads with comfortable headroom on your Mac.'
                      : bytes / 1e9 <= ramGb * 0.55
                        ? 'Will run on your Mac, but tight on RAM — context will be reduced to stay safe.'
                        : 'Large for your Mac — may run slowly or need a smaller resource mode.'}
                  </p>
                )}
                {hfUrl && (
                  <button
                    onClick={() => (window as { api?: { openExternal?: (u: string) => void } }).api?.openExternal?.(hfUrl)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-green-500 transition-colors hover:text-green-400"
                  >
                    <IconExternalLink className="h-3.5 w-3.5" /> View on Hugging Face
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-neutral-800 px-5 py-4">
                {isActive ? (
                  <span className="flex items-center gap-1 text-sm text-green-500"><IconCircleCheck className="h-4 w-4" /> Active</span>
                ) : isInstalled ? (
                  <>
                    {(m.kind === 'text' || m.kind === 'vision') && (
                      <button onClick={() => { useModel(m.id); setDetail(null); }} disabled={!!switching} className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-white transition-colors hover:border-green-500 hover:text-green-500 disabled:opacity-50">Use</button>
                    )}
                    <button onClick={() => { removeModel(m.id, m.name); setDetail(null); }} className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-red-500 hover:text-red-400">Delete</button>
                  </>
                ) : downloading ? (
                  <span className="text-sm text-neutral-400">Downloading {prog.percent}%…</span>
                ) : (
                  <button onClick={() => download(m.id)} className="flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-white transition-colors hover:border-green-500 hover:text-green-500"><IconDownload className="h-4 w-4" /> Download</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
