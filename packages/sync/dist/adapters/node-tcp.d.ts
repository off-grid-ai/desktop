import { T as TransportBridge, S as SyncConnection } from '../transport-1cXLtrs5.js';

declare class NodeTcpTransport implements TransportBridge {
    private server?;
    /** The port actually bound after listen() (useful when listening on 0). */
    boundPort?: number;
    listen(port: number, onConnection: (conn: SyncConnection) => void): Promise<void>;
    connect(host: string, port: number): Promise<SyncConnection>;
    stop(): Promise<void>;
}

export { NodeTcpTransport };
