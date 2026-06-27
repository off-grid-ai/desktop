// SQLite-backed ClipboardStore for @offgrid/clipboard. Persists clipboard
// history in the app's encrypted DB (getDB) so it lives at rest with the same
// protection as the rest of the user's data. Dedups by content hash: re-copying
// an existing item bumps it to the top instead of inserting a duplicate.

import crypto from 'crypto';
import type {
  ClipboardItem,
  ClipboardItemDisplay,
  ClipboardStore,
  ContentType,
} from '@offgrid/clipboard';
import { getDB } from './database';

interface Row {
  id: string;
  timestamp: number;
  content_type: ContentType;
  text_content: string | null;
  source_app: string | null;
  hash: string;
  raw_data: Buffer | null;
  preview: string;
}

function ensureTable(): void {
  getDB().exec(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      text_content TEXT,
      source_app TEXT,
      hash TEXT NOT NULL UNIQUE,
      raw_data BLOB,
      preview TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS clipboard_ts_idx ON clipboard_items(timestamp DESC);
  `);
}

/** Build a short, single-line preview for list/UI rendering. */
function makePreview(contentType: ContentType, textContent: string | null): string {
  if (contentType === 'image') return '[Image]';
  const t = (textContent ?? '').replace(/\s+/g, ' ').trim();
  if (contentType === 'file') return t || '[File]';
  if (!t) return `[${contentType}]`;
  return t.length > 200 ? `${t.slice(0, 200)}…` : t;
}

function toItem(row: Row): ClipboardItem {
  return {
    id: row.id,
    timestamp: row.timestamp,
    contentType: row.content_type,
    textContent: row.text_content,
    rawData: row.raw_data ? new Uint8Array(row.raw_data) : new Uint8Array(),
    sourceApp: row.source_app,
    hash: row.hash,
  };
}

function toDisplay(row: Pick<Row, 'id' | 'timestamp' | 'content_type' | 'text_content' | 'source_app' | 'preview'>): ClipboardItemDisplay {
  return {
    id: row.id,
    timestamp: row.timestamp,
    contentType: row.content_type,
    textContent: row.text_content,
    sourceApp: row.source_app,
    preview: row.preview,
  };
}

/** User-configurable retention. maxItems caps the row count; retentionDays drops
 *  anything older than N days (0 = keep forever); captureImages gates image clips. */
export interface ClipboardLimits { maxItems: number; retentionDays: number; captureImages: boolean }
const DEFAULT_LIMITS: ClipboardLimits = { maxItems: 1000, retentionDays: 0, captureImages: true };

export type ConfigurableClipboardStore = ClipboardStore & {
  setLimits(limits: Partial<ClipboardLimits>): void;
  prune(): void;
  captureImages(): boolean;
};

export function createClipboardStore(): ConfigurableClipboardStore {
  ensureTable();
  const db = getDB();
  const limits: ClipboardLimits = { ...DEFAULT_LIMITS };

  const prune = (): void => {
    // Cap by count (keep newest maxItems).
    db.prepare(
      `DELETE FROM clipboard_items WHERE id IN (
         SELECT id FROM clipboard_items ORDER BY timestamp DESC LIMIT -1 OFFSET ?
       )`
    ).run(Math.max(1, limits.maxItems));
    // Time-based retention.
    if (limits.retentionDays > 0) {
      const cutoff = Date.now() - limits.retentionDays * 86400000;
      db.prepare('DELETE FROM clipboard_items WHERE timestamp < ?').run(cutoff);
    }
  };

  return {
    setLimits(next: Partial<ClipboardLimits>): void {
      if (typeof next.maxItems === 'number') limits.maxItems = next.maxItems;
      if (typeof next.retentionDays === 'number') limits.retentionDays = next.retentionDays;
      if (typeof next.captureImages === 'boolean') limits.captureImages = next.captureImages;
      prune();
    },
    prune,
    captureImages: () => limits.captureImages,
    insert(item: Omit<ClipboardItem, 'id'>): ClipboardItem | null {
      // Honor the "don't capture images" setting.
      if (item.contentType === 'image' && !limits.captureImages) return null;
      // Dedup by hash: if we've seen this exact content, bump its timestamp so
      // it floats back to the top, and report "no new item" (return null).
      const existing = db.prepare('SELECT id FROM clipboard_items WHERE hash = ?').get(item.hash) as
        | { id: string }
        | undefined;
      if (existing) {
        db.prepare('UPDATE clipboard_items SET timestamp = ? WHERE id = ?').run(item.timestamp, existing.id);
        return null;
      }

      const id = crypto.randomUUID();
      const preview = makePreview(item.contentType, item.textContent);
      db.prepare(
        `INSERT INTO clipboard_items (id, timestamp, content_type, text_content, source_app, hash, raw_data, preview)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        item.timestamp,
        item.contentType,
        item.textContent,
        item.sourceApp,
        item.hash,
        item.rawData.length ? Buffer.from(item.rawData) : null,
        preview
      );

      // Enforce the configured cap + retention (oldest first).
      prune();

      return { id, ...item };
    },

    list(limit = 200): ClipboardItemDisplay[] {
      const rows = db
        .prepare(
          `SELECT id, timestamp, content_type, text_content, source_app, preview
           FROM clipboard_items ORDER BY timestamp DESC LIMIT ?`
        )
        .all(limit) as Row[];
      return rows.map(toDisplay);
    },

    get(id: string): ClipboardItem | null {
      const row = db.prepare('SELECT * FROM clipboard_items WHERE id = ?').get(id) as Row | undefined;
      return row ? toItem(row) : null;
    },

    remove(id: string): void {
      db.prepare('DELETE FROM clipboard_items WHERE id = ?').run(id);
    },

    clear(): void {
      db.prepare('DELETE FROM clipboard_items').run();
    },

    count(): number {
      const r = db.prepare('SELECT COUNT(*) AS n FROM clipboard_items').get() as { n: number };
      return r.n;
    },
  };
}
