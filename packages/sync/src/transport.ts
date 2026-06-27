// Transport abstraction for @offgrid/sync.
//
// The engine speaks frames (see wire.ts) over a duplex byte connection. The
// host supplies the actual transport: a Node TCP server/client on desktop, a
// React Native socket module on mobile. Keeping this an interface is what makes
// the sync engine embeddable in both apps without platform code leaking in.

/** A duplex, ordered, reliable byte stream to one remote peer. */
export interface SyncConnection {
  /** Stable id for this connection (host:port or a socket id). */
  readonly id: string;
  /** Remote host/address, when the transport knows it. */
  readonly remoteHost?: string;
  send(data: Uint8Array): void;
  onData(cb: (data: Uint8Array) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

/** Listens for inbound connections and dials outbound ones. */
export interface TransportBridge {
  /** Start accepting inbound connections on `port`. */
  listen(port: number, onConnection: (conn: SyncConnection) => void): Promise<void>;
  /** Dial a remote peer and resolve once the byte stream is open. */
  connect(host: string, port: number): Promise<SyncConnection>;
  /** Stop listening and release resources. */
  stop(): Promise<void>;
}
