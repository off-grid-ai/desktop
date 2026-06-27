// Node TCP transport for @offgrid/sync (desktop / Electron main process).
// Implements TransportBridge over node:net. The engine handles framing and
// encryption; this adapter just moves bytes. React Native supplies its own
// transport, so this Node-only adapter lives at the @offgrid/sync/node subpath
// and is never imported by the platform-agnostic core.

import net from 'net';
import type { SyncConnection, TransportBridge } from '../transport';

function wrap(socket: net.Socket): SyncConnection {
  const id = `${socket.remoteAddress ?? '?'}:${socket.remotePort ?? '?'}`;
  // Avoid uncaught 'error' events tearing down the process; surface as close.
  socket.on('error', () => socket.destroy());
  return {
    id,
    remoteHost: socket.remoteAddress ?? undefined,
    send: (data) => socket.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength)),
    onData: (cb) => socket.on('data', (d: Buffer) => cb(new Uint8Array(d.buffer, d.byteOffset, d.byteLength))),
    onClose: (cb) => socket.on('close', () => cb()),
    close: () => socket.destroy(),
  };
}

export class NodeTcpTransport implements TransportBridge {
  private server?: net.Server;
  /** The port actually bound after listen() (useful when listening on 0). */
  boundPort?: number;

  listen(port: number, onConnection: (conn: SyncConnection) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const server = net.createServer((socket) => onConnection(wrap(socket)));
      server.once('error', reject);
      server.listen(port, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') this.boundPort = addr.port;
        this.server = server;
        resolve();
      });
    });
  }

  connect(host: string, port: number): Promise<SyncConnection> {
    return new Promise<SyncConnection>((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () => resolve(wrap(socket)));
      socket.once('error', reject);
    });
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
      this.server = undefined;
    });
  }
}
