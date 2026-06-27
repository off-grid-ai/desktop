// State replication protocol over the @offgrid/sync 'state' app channel.
// PURE / platform-agnostic (same portability rationale as oplog.ts).
//
// Gossip is minimal and convergent:
//   • on connect, each peer sends `have` (its version vector)
//   • on receiving `have`, reply with `ops` the peer is missing
//   • on receiving `ops`, ingest them (and the materializer updates real tables)
//   • on a local change, broadcast `ops:[op]` to connected peers
// One round-trip each direction reconciles two devices; live ops stream after.

import type { Op, VersionVector } from './oplog';
import type { OpLog } from './oplog';

export type StateMsg = { t: 'have'; vv: VersionVector } | { t: 'ops'; ops: Op[] };

export interface StateSyncOptions {
  oplog: OpLog;
  /** Send a state message to one peer (host wires → sendApp(id,'state',msg)). */
  send: (deviceId: string, msg: StateMsg) => void;
}

export class StateSync {
  constructor(private readonly opts: StateSyncOptions) {}

  /** A peer connected: advertise our version vector so it can backfill us; we
   *  backfill it when its own `have` arrives. */
  onConnect(deviceId: string): void {
    this.opts.send(deviceId, { t: 'have', vv: this.opts.oplog.versionVector() });
  }

  /** Inbound message on the 'state' channel from a paired peer. */
  onMessage(deviceId: string, data: unknown): void {
    const msg = data as StateMsg | undefined;
    if (!msg || typeof msg !== 'object' || !('t' in msg)) return;
    if (msg.t === 'have') {
      const missing = this.opts.oplog.opsSince(msg.vv);
      if (missing.length) this.opts.send(deviceId, { t: 'ops', ops: missing });
    } else if (msg.t === 'ops' && Array.isArray(msg.ops)) {
      this.opts.oplog.ingest(msg.ops);
    }
  }
}
