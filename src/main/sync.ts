// Cross-device mesh (Phase A): embeds @offgrid/sync in the desktop main process.
// Discovers other Off Grid devices on the LAN via mDNS, auto-pairs them with
// ZERO prompts by seeding the encrypted channel from the shared Keygen license
// key, and resumes already-paired devices on sight. Gated by isProEntitled().
//
// This file owns the engine + discovery; features (chats/projects replication,
// search/LLM offload) ride the paired channel via registerApp()/sendApp() in
// later phases. See docs/SYNC_PLAN.md.

import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app, BrowserWindow, ipcMain } from 'electron';
import { SyncEngine, type DeviceInfo, type DiscoveredDevice, type PairedDevice } from '@offgrid/sync';
import { NodeTcpTransport } from '@offgrid/sync/node';
import { NodeDiscovery } from '@offgrid/sync/node-discovery';
import { isProEntitled, getSyncPairingSecret } from './licensing/license-service';
import { getDeviceFingerprint } from './licensing/device-fingerprint';
import { getDB } from './database';
import { OpLog, type Op, type Materializer } from './sync/oplog';
import { StateSync } from './sync/state-sync';
import { setEmit } from './sync/bus';
import { ensureReplicationSchema, replicationMaterializers } from './sync/replication';

const STATE_CHANNEL = 'state';

const PEERS_FILE = 'sync-peers.json';

let engine: SyncEngine | null = null;
let discovery: NodeDiscovery | null = null;
let transport: NodeTcpTransport | null = null;
let localDevice: DeviceInfo | null = null;

/** deviceId -> stored paired device (incl. sharedSecret). Persisted to disk. */
let peers: Record<string, PairedDevice> = {};
/** deviceId -> currently-visible device on the LAN. */
const discovered = new Map<string, DiscoveredDevice>();
/** Application-channel handlers registered by later-phase features. */
const appHandlers = new Map<string, (deviceId: string, data: unknown) => void>();

// ---- Op-log replication (chats / projects / memory) -----------------------

/** Per-entity materializer: writes a winning op into the host's real tables. */
export interface EntityMaterializer {
  put(entityId: string, fields: Record<string, unknown>): void;
  remove(entityId: string): void;
}
const materializers = new Map<string, EntityMaterializer>();
let oplog: OpLog | null = null;
let stateSync: StateSync | null = null;

function ensureOpsTable(): void {
  getDB().exec(`
    CREATE TABLE IF NOT EXISTS sync_ops (
      op_id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      fields TEXT,
      lamport INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sync_ops_dev_lamport ON sync_ops(device_id, lamport);
  `);
}

function loadOps(): Op[] {
  const rows = getDB()
    .prepare('SELECT op_id, entity, entity_id, kind, fields, lamport, device_id, ts FROM sync_ops')
    .all() as Array<{
    op_id: string; entity: string; entity_id: string; kind: string;
    fields: string | null; lamport: number; device_id: string; ts: number;
  }>;
  return rows.map((r) => ({
    opId: r.op_id,
    entity: r.entity,
    entityId: r.entity_id,
    kind: r.kind as Op['kind'],
    fields: r.fields ? (JSON.parse(r.fields) as Record<string, unknown>) : undefined,
    lamport: r.lamport,
    deviceId: r.device_id,
    ts: r.ts,
  }));
}

function persistOp(op: Op): void {
  getDB()
    .prepare(
      `INSERT OR IGNORE INTO sync_ops (op_id, entity, entity_id, kind, fields, lamport, device_id, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(op.opId, op.entity, op.entityId, op.kind, op.fields ? JSON.stringify(op.fields) : null, op.lamport, op.deviceId, op.ts);
}

function peersPath(): string {
  return path.join(app.getPath('userData'), PEERS_FILE);
}

function loadPeers(): void {
  try {
    peers = JSON.parse(fs.readFileSync(peersPath(), 'utf8')) as Record<string, PairedDevice>;
  } catch {
    peers = {};
  }
}

function savePeers(): void {
  try {
    fs.writeFileSync(peersPath(), JSON.stringify(peers), { mode: 0o600 });
  } catch (e) {
    console.error('[sync] savePeers failed', e);
  }
}

/** First non-internal IPv4 — the address peers dial us on. */
function lanIPv4(): string {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}

function broadcastChanged(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('sync:changed');
  }
}

/** A newly discovered device: auto-reconnect if known, else auto-pair. Only the
 *  device with the SMALLER id dials, so the two peers don't handshake twice. */
function handleFound(device: DiscoveredDevice): void {
  if (!localDevice || !engine) return;
  if (device.id === localDevice.id) return; // self
  discovered.set(device.id, device);
  broadcastChanged();

  if (engine.isPaired(device.id)) return; // already live
  if (localDevice.id > device.id) return; // larger id waits for inbound

  const known = peers[device.id];
  if (known) {
    engine.reconnect(device, known.sharedSecret).catch((e) => console.warn('[sync] reconnect failed', e));
    return;
  }
  const secret = getSyncPairingSecret();
  if (!secret) return; // not entitled / no key — nothing to seed pairing with
  engine.pair(device, secret).catch((e) => console.warn('[sync] auto-pair failed', e));
}

function handleLost(deviceId: string): void {
  discovered.delete(deviceId);
  broadcastChanged();
}

let ipcRegistered = false;
function registerIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;
  ipcMain.handle('sync:status', () => getSyncStatus());
  ipcMain.handle('sync:forget', (_e, deviceId: string) => forgetPeer(deviceId));
}

/** Initialize the mesh. IPC is always registered (so the UI can read status);
 *  the engine itself stays off unless this device is Pro. */
export async function setupSync(): Promise<void> {
  registerIpc();
  // Unconditional: message tables need a mesh-safe `uuid` whether or not the
  // mesh runs, since local writes always stamp one.
  try {
    ensureReplicationSchema();
  } catch (e) {
    console.error('[sync] replication schema migration failed', e);
  }
  if (!isProEntitled()) {
    console.log('[sync] not entitled — mesh disabled');
    return;
  }
  if (engine) return; // already running

  try {
    loadPeers();
    const id = await getDeviceFingerprint();
    localDevice = {
      id,
      name: os.hostname(),
      platform: 'macos', // TODO widen @offgrid/sync platform union for win/ios/linux
      version: app.getVersion(),
      host: lanIPv4(),
      port: 0, // set after listen
    };

    // Op-log replication substrate: rehydrate from disk, dispatch materialized
    // writes to whichever feature registered for that entity (chats/projects
    // wire theirs in the next sub-step).
    ensureOpsTable();
    const dispatch: Materializer = {
      put: (entity, entityId, fields) => materializers.get(entity)?.put(entityId, fields),
      remove: (entity, entityId) => materializers.get(entity)?.remove(entityId),
    };
    oplog = new OpLog({
      deviceId: id,
      materializer: dispatch,
      persist: persistOp,
      uuid: () => crypto.randomUUID(),
      now: () => Date.now(),
      persisted: loadOps(),
    });
    stateSync = new StateSync({ oplog, send: (deviceId, msg) => sendApp(deviceId, STATE_CHANNEL, msg) });
    appHandlers.set(STATE_CHANNEL, (deviceId, data) => stateSync?.onMessage(deviceId, data));

    // Wire replicated entities: remote ops materialize into the real tables,
    // and local writes (via the CRUD functions) emit ops through this hook.
    for (const [entity, m] of Object.entries(replicationMaterializers)) registerMaterializer(entity, m);
    setEmit(recordLocalChange);

    transport = new NodeTcpTransport();
    engine = new SyncEngine({
      localDevice,
      transport,
      // Zero-touch pairing: both devices answer with the license key, never sent
      // on the wire (only derived proofs are). No DeviceCapPolicy — Keygen owns
      // the 5-machine cap.
      getPassphrase: () => getSyncPairingSecret(),
      getSharedSecret: (deviceId) => peers[deviceId]?.sharedSecret,
      onPaired: (device) => {
        peers[device.id] = { ...device, lastConnected: Date.now() };
        savePeers();
        console.log(`[sync] paired with ${device.name} (${device.id})`);
        // Reconcile op-logs: advertise our version vector so the peer backfills us.
        stateSync?.onConnect(device.id);
        broadcastChanged();
      },
      onPairingFailed: (remote, error) => console.warn(`[sync] pairing failed (${remote?.name ?? '?'}): ${error}`),
      onAppMessage: (deviceId, channel, data) => {
        const h = appHandlers.get(channel);
        if (h) h(deviceId, data);
        else console.log(`[sync] app message on unhandled channel '${channel}' from ${deviceId}`);
      },
    });

    // Listen on an ephemeral port, then advertise the bound port over mDNS.
    await engine.start(0);
    localDevice.port = transport.boundPort ?? 0;

    discovery = new NodeDiscovery();
    discovery.onDeviceFound(handleFound);
    discovery.onDeviceLost(handleLost);
    await discovery.start();
    await discovery.advertise(localDevice);

    console.log(`[sync] mesh up — ${localDevice.name} on ${localDevice.host}:${localDevice.port}`);
    broadcastChanged();
  } catch (e) {
    console.error('[sync] setup failed', e);
  }

  app.on('will-quit', () => {
    void stopSync();
  });
}

export async function stopSync(): Promise<void> {
  try {
    await discovery?.stop();
    await engine?.stop();
  } catch {
    /* ignore */
  }
  discovery = null;
  engine = null;
  transport = null;
}

// ---- Surface for IPC / later phases ---------------------------------------

export interface SyncPeerStatus {
  id: string;
  name: string;
  platform: string;
  nearby: boolean; // visible on the LAN right now
  paired: boolean; // we hold a shared secret
  connected: boolean; // live session
}

export function getSyncStatus(): {
  enabled: boolean;
  device: { id: string; name: string; platform: string } | null;
  peers: SyncPeerStatus[];
} {
  const ids = new Set<string>([...Object.keys(peers), ...discovered.keys()]);
  const peerList: SyncPeerStatus[] = [...ids].map((id) => {
    const d = discovered.get(id);
    const p = peers[id];
    return {
      id,
      name: d?.name ?? p?.name ?? id,
      platform: d?.platform ?? p?.platform ?? 'unknown',
      nearby: discovered.has(id),
      paired: !!p,
      connected: engine?.isPaired(id) ?? false,
    };
  });
  return {
    enabled: !!engine,
    device: localDevice ? { id: localDevice.id, name: localDevice.name, platform: localDevice.platform } : null,
    peers: peerList,
  };
}

/** Forget a paired device (drops the stored secret; it can re-pair later). */
export function forgetPeer(deviceId: string): void {
  delete peers[deviceId];
  savePeers();
  broadcastChanged();
}

/** Register a handler for an app channel (Phase B/C: 'state', 'rpc', ...). */
export function registerApp(channel: string, handler: (deviceId: string, data: unknown) => void): void {
  appHandlers.set(channel, handler);
}

/** Send an app-channel message to a paired device. Returns false if not connected. */
export function sendApp(deviceId: string, channel: string, data: unknown): boolean {
  return engine?.sendApp(deviceId, channel, data) ?? false;
}

/** Broadcast an app-channel message to every connected peer. */
export function broadcastApp(channel: string, data: unknown): void {
  for (const id of Object.keys(peers)) engine?.sendApp(id, channel, data);
}

// ---- Op-log API for replicated features (chats / projects / memory) -------

/** Register how a replicated entity's winning ops write into real tables.
 *  Call at boot, before peers connect, so backfilled ops materialize. */
export function registerMaterializer(entity: string, m: EntityMaterializer): void {
  materializers.set(entity, m);
}

/** Record a LOCAL change to a replicated record and stream it to connected
 *  peers. `kind:'put'` carries the whole record; `kind:'delete'` is a tombstone.
 *  No-op when the mesh isn't running (not Pro / not yet started). */
export function recordLocalChange(
  entity: string,
  entityId: string,
  kind: 'put' | 'delete',
  fields?: Record<string, unknown>
): void {
  if (!oplog) return;
  const op = oplog.record(entity, entityId, kind, fields);
  broadcastApp(STATE_CHANNEL, { t: 'ops', ops: [op] });
}
