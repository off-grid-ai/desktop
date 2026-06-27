// Shared types + helpers for the clipboard manager UI (in-app screen + popup).

export type ContentType = 'text' | 'rtf' | 'image' | 'file';

export interface ClipItem {
  id: string;
  timestamp: number;
  contentType: ContentType;
  textContent: string | null;
  sourceApp: string | null;
  preview: string;
}

export interface SearchResult {
  item: ClipItem;
  score: number;
  matches: Array<[number, number]>;
}

/** Convert a data: URL to a blob: URL. Chromium's built-in PDF viewer renders blob
 *  URLs in an <iframe> but NOT data: URLs — hence this. Caller should revokeObjectURL. */
export function dataUrlToBlobUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  const mime = /data:(.*?)(;base64)?,/.exec(dataUrl)?.[1] || 'application/octet-stream';
  const bin = atob(dataUrl.slice(comma + 1));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}

/** A clip that can be shown as an image: pixel-data image clips, or copied image FILES. */
export function isImageClip(it: { contentType: ContentType; textContent?: string | null; preview?: string }): boolean {
  if (it.contentType === 'image') return true;
  if (it.contentType === 'file') return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(it.textContent || it.preview || '');
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const clip = () => (window as any).api?.clipboard as
  | {
      list: (limit?: number) => Promise<ClipItem[]>;
      search: (query: string) => Promise<SearchResult[]>;
      getImage: (id: string) => Promise<string | null>;
      fileText: (id: string) => Promise<string | null>;
      fileDataUrl: (id: string) => Promise<string | null>;
      restore: (id: string) => Promise<boolean>;
      paste: (id: string) => Promise<boolean>;
      remove: (id: string) => Promise<void>;
      clear: () => Promise<void>;
      count: () => Promise<number>;
      hidePopup: () => Promise<void>;
      onChanged: (cb: () => void) => () => void;
      onPopupOpened: (cb: () => void) => () => void;
    }
  | undefined;

/** Compact relative time, e.g. "now", "3m", "2h", "Jun 21". */
export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function typeLabel(t: ContentType): string {
  switch (t) {
    case 'image':
      return 'Image';
    case 'file':
      return 'File';
    case 'rtf':
      return 'Rich text';
    default:
      return 'Text';
  }
}
