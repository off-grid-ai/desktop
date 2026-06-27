/** A duplex, ordered, reliable byte stream to one remote peer. */
interface SyncConnection {
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
interface TransportBridge {
    /** Start accepting inbound connections on `port`. */
    listen(port: number, onConnection: (conn: SyncConnection) => void): Promise<void>;
    /** Dial a remote peer and resolve once the byte stream is open. */
    connect(host: string, port: number): Promise<SyncConnection>;
    /** Stop listening and release resources. */
    stop(): Promise<void>;
}

export type { SyncConnection as S, TransportBridge as T };
