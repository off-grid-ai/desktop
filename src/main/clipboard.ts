// Clipboard manager service (Core). Wires the platform-agnostic
// @offgrid/clipboard engine to Electron: polls the OS clipboard, persists
// history via the SQLite store, exposes IPC for the in-app Clipboard screen,
// and drives a global-hotkey floating quick-paste popup (copyclip's signature
// UX). All on-device; nothing leaves the machine.

import { app, clipboard, nativeImage, globalShortcut, BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { is } from '@electron-toolkit/utils';
import { ClipboardEngine, fuzzySearch } from '@offgrid/clipboard';
import { ElectronClipboardBridge } from '@offgrid/clipboard/electron';
import { createClipboardStore, type ConfigurableClipboardStore } from './clipboard-store';
import { getSetting, saveSetting } from './database';

// Quick-paste hotkey. copyclip used Cmd+Shift+C; kept identical here.
const HOTKEY = 'CommandOrControl+Shift+C';

// User-tunable clipboard behavior (persisted in app settings).
interface ClipboardSettings { captureEnabled: boolean; maxItems: number; retentionDays: number; captureImages: boolean }
const DEFAULT_SETTINGS: ClipboardSettings = { captureEnabled: true, maxItems: 1000, retentionDays: 0, captureImages: true };
let settings: ClipboardSettings = { ...DEFAULT_SETTINGS };

let store: ConfigurableClipboardStore | null = null;
let bridge: ElectronClipboardBridge | null = null;
let engine: ClipboardEngine | null = null;
let popup: BrowserWindow | null = null;

/** Tell every window (main + popup) the history changed so lists refresh. */
function broadcastChanged(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('clipboard:changed');
  }
}

function getPopup(): BrowserWindow {
  if (popup && !popup.isDestroyed()) return popup;
  popup = new BrowserWindow({
    width: 640,
    height: 540,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'Off Grid Clipboard',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      plugins: true, // Chromium's built-in PDF viewer needs the plugin enabled
    },
  });
  popup.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Dismiss when it loses focus (user clicked elsewhere / pressed Esc handled in UI).
  popup.on('blur', () => popup?.hide());

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void popup.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#clip-popup`);
  } else {
    void popup.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'clip-popup' });
  }
  return popup;
}

function togglePopup(): void {
  const w = getPopup();
  if (w.isVisible()) {
    w.hide();
    return;
  }
  // Open near the cursor, clamped to the active display's work area.
  try {
    const pt = screen.getCursorScreenPoint();
    const disp = screen.getDisplayNearestPoint(pt);
    const [ww, wh] = w.getSize();
    const wa = disp.workArea;
    const x = Math.min(Math.max(pt.x - ww / 2, wa.x + 8), wa.x + wa.width - ww - 8);
    const y = Math.min(Math.max(pt.y - 40, wa.y + 8), wa.y + wa.height - wh - 8);
    w.setPosition(Math.round(x), Math.round(y));
  } catch {
    w.center();
  }
  w.webContents.send('clipboard:popup-opened');
  w.show();
  w.focus();
}

/** Write the stored item back onto the OS clipboard. */
function restore(id: string): boolean {
  if (!store || !bridge) return false;
  const item = store.get(id);
  if (!item) return false;
  // A copied image FILE stores its bytes but bridge.write would put only the
  // filename TEXT on the clipboard (file clips fall to the text path). Restore it
  // as real image DATA so it pastes as an image, not the filename.
  if (item.contentType === 'file' && item.rawData?.length && /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(item.textContent || '')) {
    try {
      const img = nativeImage.createFromBuffer(Buffer.from(item.rawData));
      if (!img.isEmpty()) { clipboard.writeImage(img); return true; }
    } catch { /* fall through to the normal bridge write */ }
  }
  // Other files (PDF/DOCX/…): write the bytes back to disk and put a real FILE URL
  // on the clipboard, so pasting attaches the file instead of its name. (bridge.write
  // would otherwise write only the filename text.)
  if (item.contentType === 'file' && item.rawData?.length) {
    try {
      const dir = join(app.getPath('userData'), 'clip-files');
      fs.mkdirSync(dir, { recursive: true });
      const fp = join(dir, item.textContent || `clip-${id}`);
      fs.writeFileSync(fp, Buffer.from(item.rawData));
      clipboard.writeBuffer('public.file-url', Buffer.from(pathToFileURL(fp).href, 'utf8'));
      return true;
    } catch { /* fall through to the normal bridge write */ }
  }
  bridge.write(item);
  return true;
}

/** macOS: synthesize Cmd+V into whatever app regained focus after we hid the
 *  popup. Best-effort — needs Accessibility permission; if it's not granted the
 *  content is still on the clipboard for a manual paste. */
function synthesizePaste(): void {
  if (process.platform !== 'darwin') return;
  execFile(
    'osascript',
    ['-e', 'tell application "System Events" to keystroke "v" using command down'],
    (err) => {
      if (err) console.warn('[clipboard] paste keystroke failed (Accessibility not granted?)', err.message);
    }
  );
}

function registerIpc(): void {
  ipcMain.handle('clipboard:list', (_e, limit?: number) => store?.list(limit) ?? []);

  ipcMain.handle('clipboard:search', (_e, query: string) => {
    if (!store) return [];
    const q = (query ?? '').trim();
    const items = store.list(500);
    if (!q) return items.map((item) => ({ item, score: 0, matches: [] as Array<[number, number]> }));
    return fuzzySearch(items, q);
  });

  // Full-resolution image as a data URL, for previewing. Serves both pixel-data
  // image clips AND copied image FILES (a file clip stores the full file bytes).
  ipcMain.handle('clipboard:get-image', (_e, id: string) => {
    const item = store?.get(id);
    if (!item || !item.rawData.length) return null;
    if (item.contentType === 'image') return `data:image/png;base64,${Buffer.from(item.rawData).toString('base64')}`;
    if (item.contentType === 'file') {
      const m = /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.exec(item.textContent || '');
      if (m) { const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase(); return `data:image/${ext};base64,${Buffer.from(item.rawData).toString('base64')}`; }
    }
    return null;
  });

  // Raw file bytes as a data URL (PDF for now), so the preview can render the actual
  // document in Chromium's built-in viewer instead of dumping parsed text.
  ipcMain.handle('clipboard:file-data-url', (_e, id: string) => {
    const item = store?.get(id);
    if (!item || item.contentType !== 'file' || !item.rawData.length) return null;
    if (/\.pdf$/i.test(item.textContent || '')) return `data:application/pdf;base64,${Buffer.from(item.rawData).toString('base64')}`;
    return null;
  });

  // Extracted text for a file clip (PDF/DOCX/text), for the popup preview pane.
  ipcMain.handle('clipboard:file-text', async (_e, id: string) => {
    const item = store?.get(id);
    if (!item || item.contentType !== 'file' || !item.rawData.length) return null;
    try {
      const { processUpload } = await import('./files');
      const r = await processUpload(item.textContent || 'file', item.rawData);
      return (r.text || '').slice(0, 8000) || null;
    } catch { return null; }
  });

  ipcMain.handle('clipboard:restore', (_e, id: string) => restore(id));

  // Used by the popup: put the item on the clipboard, hide, then paste.
  ipcMain.handle('clipboard:paste', (_e, id: string) => {
    const ok = restore(id);
    popup?.hide();
    if (ok) setTimeout(synthesizePaste, 120); // let focus return to the prior app
    return ok;
  });

  ipcMain.handle('clipboard:delete', (_e, id: string) => {
    store?.remove(id);
    broadcastChanged();
  });

  ipcMain.handle('clipboard:clear', () => {
    store?.clear();
    broadcastChanged();
  });

  ipcMain.handle('clipboard:count', () => store?.count() ?? 0);

  ipcMain.handle('clipboard:hide-popup', () => popup?.hide());

  ipcMain.handle('clipboard:get-settings', () => settings);
  ipcMain.handle('clipboard:set-settings', (_e, next: Partial<ClipboardSettings>) => {
    applySettings(next);
    return settings;
  });
}

/** Merge + persist clipboard settings and apply them to the store + engine. */
function applySettings(next: Partial<ClipboardSettings>): void {
  settings = { ...settings, ...next };
  saveSetting('clipboard:settings', settings);
  store?.setLimits({ maxItems: settings.maxItems, retentionDays: settings.retentionDays, captureImages: settings.captureImages });
  // Pause/resume capture without tearing down the store or hotkey.
  if (engine) {
    if (settings.captureEnabled) engine.start();
    else engine.stop();
  }
}

function registerHotkey(): void {
  try {
    const ok = globalShortcut.register(HOTKEY, togglePopup);
    if (ok) console.log(`[clipboard] global hotkey registered: ${HOTKEY}`);
    else console.warn(`[clipboard] could not register hotkey ${HOTKEY} (in use?)`);
  } catch (e) {
    console.error('[clipboard] hotkey registration failed', e);
  }
}

/** Initialize the clipboard manager. Safe to call once at startup. */
export function setupClipboard(): void {
  try {
    settings = { ...DEFAULT_SETTINGS, ...getSetting<Partial<ClipboardSettings>>('clipboard:settings', {}) };
    store = createClipboardStore();
    store.setLimits({ maxItems: settings.maxItems, retentionDays: settings.retentionDays, captureImages: settings.captureImages });
    bridge = new ElectronClipboardBridge(clipboard, nativeImage);
    engine = new ClipboardEngine({
      bridge,
      store,
      hash: (data) => crypto.createHash('sha256').update(Buffer.from(data)).digest('hex'),
      pollIntervalMs: 500,
    });
    engine.onItem(() => broadcastChanged());
    if (settings.captureEnabled) engine.start();
    registerIpc();
    registerHotkey();
    console.log(`[clipboard] ready (capture ${settings.captureEnabled ? 'on' : 'off'})`);
  } catch (e) {
    console.error('[clipboard] setup failed', e);
  }

  app.on('will-quit', () => {
    try {
      globalShortcut.unregister(HOTKEY);
    } catch {
      /* ignore */
    }
    engine?.stop();
  });
}
