import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlass,
  Image as ImageIcon,
  FileText,
  File as FileIcon,
  ClipboardText,
} from '@phosphor-icons/react';
import { clip, timeAgo, typeLabel, isImageClip, type ClipItem, type ContentType } from './clipboard/clipboardUtil';

function TypeIcon({ type, className }: { type: ContentType; className?: string }): React.JSX.Element {
  if (type === 'image') return <ImageIcon className={className} />;
  if (type === 'file') return <FileIcon className={className} />;
  if (type === 'rtf') return <FileText className={className} />;
  return <ClipboardText className={className} />;
}

/** Compact quick-paste popup shown by the global hotkey (⌘⇧C). Pick an item to
 *  paste it into whatever app was focused before the popup opened. */
export function ClipboardPopup(): React.JSX.Element {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const api = clip();
    if (!api) return;
    const q = query.trim();
    const next = q ? (await api.search(q)).map((r) => r.item) : await api.list(100);
    setItems(next);
    setSel(0);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh + refocus each time the popup is (re)opened by the hotkey.
  useEffect(() => {
    const offChanged = clip()?.onChanged(() => void load());
    const offOpened = clip()?.onPopupOpened(() => {
      setQuery('');
      void load();
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => {
      offChanged?.();
      offOpened?.();
    };
  }, [load]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-i="${sel}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  // Load a full-resolution preview for the selected image (the list only has a label).
  useEffect(() => {
    const it = items[sel];
    let live = true;
    setPreviewImg(null);
    setFileText(null);
    if (it && isImageClip(it)) {
      void clip()?.getImage(it.id).then((url) => { if (live) setPreviewImg(url); }).catch(() => {});
    } else if (it && it.contentType === 'file') {
      // Show extracted document text (PDF/DOCX/text). Native PDF render in an embedded
      // Electron window is unreliable (black frame), so the text preview is canonical.
      void clip()?.fileText(it.id).then((t) => { if (live) setFileText(t); }).catch(() => {});
    }
    return () => { live = false; };
  }, [items, sel]);

  const paste = useCallback((id: string) => {
    void clip()?.paste(id);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void clip()?.hidePopup();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((s) => Math.min(items.length - 1, s + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => Math.max(0, s - 1));
      } else if (e.key === 'Enter' && items[sel]) {
        e.preventDefault();
        paste(items[sel].id);
      }
    },
    [items, sel, paste]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950/95 text-neutral-200" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <MagnifyingGlass className="h-4 w-4 text-neutral-500" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste from history…"
          className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
        />
        <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">esc</kbd>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* List */}
        <div ref={listRef} className="min-h-0 w-1/2 shrink-0 overflow-y-auto border-r border-neutral-800">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-600">
              {query ? 'No matches' : 'Nothing copied yet'}
            </div>
          ) : (
            items.map((it, i) => (
              <button
                key={it.id}
                data-i={i}
                onMouseEnter={() => setSel(i)}
                onClick={() => paste(it.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${
                  i === sel ? 'bg-emerald-500/15' : 'hover:bg-neutral-900'
                }`}
              >
                <TypeIcon type={it.contentType} className={`h-4 w-4 shrink-0 ${i === sel ? 'text-emerald-400' : 'text-neutral-500'}`} />
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">{it.preview || typeLabel(it.contentType)}</span>
                <span className="shrink-0 text-[10px] text-neutral-600">{timeAgo(it.timestamp)}</span>
              </button>
            ))
          )}
        </div>
        {/* Preview pane — full image for image items, full text otherwise */}
        <div className="min-h-0 w-1/2 overflow-auto p-4">
          {(() => {
            const it = items[sel];
            if (!it) return <div className="flex h-full items-center justify-center text-xs text-neutral-700">Select an item</div>;
            if (isImageClip(it)) {
              return previewImg
                ? <img src={previewImg} alt="" className="max-h-full max-w-full rounded-md border border-neutral-800 object-contain" />
                : <div className="flex h-full items-center justify-center text-xs text-neutral-700">Loading preview…</div>;
            }
            // File clips: show extracted document text (PDF/DOCX/text) when available.
            const body = it.contentType === 'file'
              ? (fileText ?? (fileText === null ? 'Reading document…' : ''))
              : (it.preview || typeLabel(it.contentType));
            return (
              <div className="flex h-full flex-col">
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-neutral-600">
                  <TypeIcon type={it.contentType} className="h-3.5 w-3.5" /> {it.contentType === 'file' ? (it.textContent || 'File') : typeLabel(it.contentType)} · {timeAgo(it.timestamp)}
                </div>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-300">{body}</pre>
              </div>
            );
          })()}
        </div>
      </div>
      <div className="border-t border-neutral-900 px-3 py-1.5 text-[10px] text-neutral-600">
        ↑↓ navigate · ↵ paste · esc close
      </div>
    </div>
  );
}
