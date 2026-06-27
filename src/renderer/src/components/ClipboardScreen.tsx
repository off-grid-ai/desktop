import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MagnifyingGlass,
  Trash,
  Copy,
  Check,
  Image as ImageIcon,
  FileText,
  File as FileIcon,
  ClipboardText,
} from '@phosphor-icons/react';
import { clip, timeAgo, typeLabel, type ClipItem, type ContentType } from './clipboard/clipboardUtil';

function TypeIcon({ type, className }: { type: ContentType; className?: string }): React.JSX.Element {
  if (type === 'image') return <ImageIcon className={className} />;
  if (type === 'file') return <FileIcon className={className} />;
  if (type === 'rtf') return <FileText className={className} />;
  return <ClipboardText className={className} />;
}

export function ClipboardScreen(): React.JSX.Element {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const api = clip();
    if (!api) return;
    const q = query.trim();
    if (q) {
      const results = await api.search(q);
      setItems(results.map((r) => r.item));
    } else {
      setItems(await api.list(300));
    }
  }, [query]);

  // Initial load + refresh whenever the history changes (new copy, delete, clear).
  useEffect(() => {
    void load();
    const off = clip()?.onChanged(() => void load());
    return off;
  }, [load]);

  // Keep a valid selection as the list changes.
  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  // Load the full image when an image item is selected.
  useEffect(() => {
    let cancelled = false;
    setImagePreview(null);
    if (selected?.contentType === 'image') {
      void clip()
        ?.getImage(selected.id)
        .then((url) => {
          if (!cancelled) setImagePreview(url);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const restore = useCallback(async (id: string) => {
    await clip()?.restore(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1200);
  }, []);

  const remove = useCallback(async (id: string) => {
    await clip()?.remove(id);
  }, []);

  const clearAll = useCallback(async () => {
    if (items.length === 0) return;
    await clip()?.clear();
  }, [items.length]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;
      const idx = items.findIndex((i) => i.id === selectedId);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedId(items[Math.min(items.length - 1, idx + 1)].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedId(items[Math.max(0, idx - 1)].id);
      } else if (e.key === 'Enter' && selectedId) {
        e.preventDefault();
        void restore(selectedId);
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && (e.metaKey || e.ctrlKey) && selectedId) {
        e.preventDefault();
        void remove(selectedId);
      }
    },
    [items, selectedId, restore, remove]
  );

  // Keep the selected row in view during keyboard nav.
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-200" onKeyDown={onKeyDown} tabIndex={-1}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <ClipboardText className="h-4 w-4 text-emerald-400" weight="bold" />
          <h1 className="text-sm font-semibold tracking-wide text-white">Clipboard</h1>
          <span className="text-xs text-neutral-500">{items.length} items</span>
          <span className="ml-2 flex items-center gap-1 text-[11px] text-neutral-500">
            <span>Quick open anywhere</span>
            <kbd className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">⌘⇧C</kbd>
          </span>
        </div>
        <button
          onClick={clearAll}
          disabled={items.length === 0}
          className="flex items-center gap-1.5 rounded border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200 disabled:opacity-40"
        >
          <Trash className="h-3.5 w-3.5" /> Clear all
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-neutral-900 px-5 py-2.5">
        <div className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 focus-within:border-emerald-500/60">
          <MagnifyingGlass className="h-4 w-4 text-neutral-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clipboard history…"
            className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Two-pane: list + preview */}
      <div className="flex min-h-0 flex-1">
        <div ref={listRef} className="w-1/2 min-w-[320px] overflow-y-auto border-r border-neutral-900">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-neutral-600">
              <ClipboardText className="h-8 w-8" />
              <p className="text-sm">{query ? 'No matches.' : 'Nothing copied yet.'}</p>
              {!query && <p className="text-xs">Copy anything — it shows up here. Press ⌘⇧C anywhere for quick paste.</p>}
            </div>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                data-id={it.id}
                onClick={() => setSelectedId(it.id)}
                onDoubleClick={() => void restore(it.id)}
                className={`flex w-full items-start gap-3 border-b border-neutral-900 px-4 py-2.5 text-left transition-colors ${
                  it.id === selectedId ? 'bg-neutral-900' : 'hover:bg-neutral-900/50'
                }`}
              >
                <TypeIcon
                  type={it.contentType}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${it.id === selectedId ? 'text-emerald-400' : 'text-neutral-500'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-200">{it.preview || typeLabel(it.contentType)}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-600">
                    <span>{typeLabel(it.contentType)}</span>
                    {it.sourceApp && <span className="truncate">· {it.sourceApp}</span>}
                    <span>· {timeAgo(it.timestamp)}</span>
                  </div>
                </div>
                {copiedId === it.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" weight="bold" />}
              </button>
            ))
          )}
        </div>

        {/* Preview */}
        <div className="flex w-1/2 flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-2.5">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <TypeIcon type={selected.contentType} className="h-3.5 w-3.5" />
                  <span>{typeLabel(selected.contentType)}</span>
                  <span>· {timeAgo(selected.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void restore(selected.id)}
                    className="flex items-center gap-1.5 rounded bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-400 transition-colors hover:bg-emerald-500/25"
                  >
                    {copiedId === selected.id ? <Check className="h-3.5 w-3.5" weight="bold" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === selected.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => void remove(selected.id)}
                    className="flex items-center gap-1.5 rounded border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-5">
                {selected.contentType === 'image' ? (
                  imagePreview ? (
                    <img src={imagePreview} alt="clipboard" className="max-h-full max-w-full rounded border border-neutral-800 object-contain" />
                  ) : (
                    <div className="text-sm text-neutral-600">Loading image…</div>
                  )
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-neutral-300">
                    {selected.textContent || selected.preview}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-600">Select an item to preview</div>
          )}
        </div>
      </div>
    </div>
  );
}
