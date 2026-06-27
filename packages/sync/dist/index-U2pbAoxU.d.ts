interface DeviceInfo {
    id: string;
    name: string;
    platform: 'macos' | 'android';
    version: string;
    host: string;
    port: number;
}
interface DiscoveredDevice extends DeviceInfo {
    lastSeen: number;
}
interface PairedDevice extends DeviceInfo {
    sharedSecret: string;
    pairedAt: number;
    lastConnected?: number;
}
interface PairingChallenge {
    challenge: string;
    timestamp: number;
}
interface PairingResponse {
    response: string;
    deviceInfo: DeviceInfo;
}
type PairingStatus = 'idle' | 'waiting' | 'verifying' | 'success' | 'failed';
type TransferType = 'text' | 'file' | 'files';
interface TransferMetadata {
    id: string;
    type: TransferType;
    timestamp: number;
    direction: 'send' | 'receive';
    deviceId: string;
    deviceName: string;
}
interface TextTransfer extends TransferMetadata {
    type: 'text';
    content: string;
}
interface FileTransfer extends TransferMetadata {
    type: 'file';
    fileName: string;
    fileSize: number;
    mimeType: string;
    filePath?: string;
    durationMs?: number;
    speedBytesPerSec?: number;
}
interface FilesTransfer extends TransferMetadata {
    type: 'files';
    files: Array<{
        fileName: string;
        fileSize: number;
        mimeType: string;
        filePath?: string;
    }>;
    totalSize: number;
}
type Transfer = TextTransfer | FileTransfer | FilesTransfer;
interface TransferProgress {
    transferId: string;
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
    currentFile?: string;
    speedBytesPerSec?: number;
    etaSeconds?: number;
    elapsedMs?: number;
}
interface TransferQueueItem {
    id: string;
    fileName: string;
    fileSize: number;
    status: 'pending' | 'transferring' | 'completed' | 'failed';
    progress: number;
    direction: 'send' | 'receive';
}
type MessageType = 'ping' | 'pong' | 'pair_request' | 'pair_challenge' | 'pair_response' | 'pair_confirm' | 'pair_reject' | 'hello' | 'text' | 'file_request' | 'file_accept' | 'file_reject' | 'file_chunk' | 'file_complete' | 'file_ack' | 'app' | 'error';
interface Message {
    type: MessageType;
    id: string;
    timestamp: number;
    payload?: unknown;
}
/** Generic encrypted application message: a channel name + arbitrary payload.
 * Lets features (memory sync, clipboard sync, ...) ride the paired channel
 * without each needing its own protocol message type. */
interface AppMessage extends Message {
    type: 'app';
    payload: {
        channel: string;
        data: unknown;
    };
}
/** Reconnect greeting: identifies the device so an already-paired peer can
 * resume with the stored shared secret, skipping the pairing handshake. */
interface HelloMessage extends Message {
    type: 'hello';
    payload: {
        deviceInfo: DeviceInfo;
    };
}
interface PingMessage extends Message {
    type: 'ping';
}
interface PongMessage extends Message {
    type: 'pong';
}
interface PairRequestMessage extends Message {
    type: 'pair_request';
    payload: {
        deviceInfo: DeviceInfo;
    };
}
interface PairChallengeMessage extends Message {
    type: 'pair_challenge';
    payload: PairingChallenge;
}
interface PairResponseMessage extends Message {
    type: 'pair_response';
    payload: PairingResponse;
}
interface PairConfirmMessage extends Message {
    type: 'pair_confirm';
    payload: {
        deviceInfo: DeviceInfo;
    };
}
interface PairRejectMessage extends Message {
    type: 'pair_reject';
    payload: {
        reason: string;
    };
}
interface TextMessage extends Message {
    type: 'text';
    payload: {
        content: string;
    };
}
interface FileRequestMessage extends Message {
    type: 'file_request';
    payload: {
        fileName: string;
        fileSize: number;
        mimeType: string;
        checksum: string;
        httpUrl?: string;
    };
}
interface FileAcceptMessage extends Message {
    type: 'file_accept';
    payload: {
        requestId: string;
        uploadUrl?: string;
    };
}
interface FileRejectMessage extends Message {
    type: 'file_reject';
    payload: {
        requestId: string;
        reason: string;
    };
}
interface FileChunkMessage extends Message {
    type: 'file_chunk';
    payload: {
        requestId: string;
        chunkIndex: number;
        totalChunks: number;
        data: string;
    };
}
interface FileCompleteMessage extends Message {
    type: 'file_complete';
    payload: {
        requestId: string;
        checksum: string;
    };
}
interface FileAckMessage extends Message {
    type: 'file_ack';
    payload: {
        requestId: string;
        success: boolean;
    };
}
interface ErrorMessage extends Message {
    type: 'error';
    payload: {
        code: string;
        message: string;
        originalMessageId?: string;
    };
}
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'pairing';
type PairingStep = 'idle' | 'connecting' | 'sending_request' | 'waiting_for_passphrase' | 'deriving_key' | 'sending_challenge' | 'waiting_for_challenge' | 'responding_to_challenge' | 'verifying_response' | 'confirming' | 'success' | 'failed';
interface ConnectionState {
    status: ConnectionStatus;
    device?: DeviceInfo;
    error?: string;
    /** Verbose status message for UI display */
    statusMessage?: string;
    /** Current step in the pairing process */
    pairingStep?: PairingStep;
}
interface AppSettings {
    deviceName: string;
    deviceId: string;
    autoAcceptFromPaired: boolean;
    saveDirectory: string;
    notificationsEnabled: boolean;
}
interface StoredData {
    settings: AppSettings;
    pairedDevices: PairedDevice[];
    transferHistory: Transfer[];
}

declare const MDNS_SERVICE_TYPE = "_easyshare._tcp";
declare const MDNS_SERVICE_NAME = "EasyShare";
declare const MDNS_DOMAIN = "local";
declare const TXT_DEVICE_ID = "id";
declare const TXT_DEVICE_NAME = "name";
declare const TXT_PLATFORM = "platform";
declare const TXT_VERSION = "version";
/**
 * Create TXT record data for mDNS advertisement
 */
declare function createTxtRecord(device: DeviceInfo): Record<string, string>;
/**
 * Parse TXT record data from mDNS discovery
 */
declare function parseTxtRecord(txt: Record<string, string>, host: string, port: number): DeviceInfo | null;
/**
 * Create a DiscoveredDevice from DeviceInfo
 */
declare function createDiscoveredDevice(device: DeviceInfo): DiscoveredDevice;
/**
 * Check if a discovered device is stale (not seen recently)
 */
declare function isDeviceStale(device: DiscoveredDevice, maxAgeMs?: number): boolean;
/**
 * Filter out stale devices from a list
 */
declare function filterStaleDevices(devices: DiscoveredDevice[], maxAgeMs?: number): DiscoveredDevice[];
/**
 * Update or add a device to a list of discovered devices
 */
declare function updateDeviceList(devices: DiscoveredDevice[], newDevice: DiscoveredDevice): DiscoveredDevice[];
/**
 * Remove a device from the list by ID
 */
declare function removeDevice(devices: DiscoveredDevice[], deviceId: string): DiscoveredDevice[];
interface DiscoveryService {
    start(): Promise<void>;
    stop(): Promise<void>;
    advertise(device: DeviceInfo): Promise<void>;
    stopAdvertising(): Promise<void>;
    onDeviceFound(callback: (device: DiscoveredDevice) => void): void;
    onDeviceLost(callback: (deviceId: string) => void): void;
}

export { type AppMessage as A, type PingMessage as B, type ConnectionState as C, type DiscoveryService as D, type ErrorMessage as E, type FileAcceptMessage as F, type PongMessage as G, type HelloMessage as H, TXT_DEVICE_ID as I, TXT_DEVICE_NAME as J, TXT_PLATFORM as K, TXT_VERSION as L, type Message as M, type Transfer as N, type TransferMetadata as O, type PairingStatus as P, type TransferQueueItem as Q, type TransferType as R, type StoredData as S, type TransferProgress as T, createDiscoveredDevice as U, createTxtRecord as V, filterStaleDevices as W, isDeviceStale as X, parseTxtRecord as Y, removeDevice as Z, updateDeviceList as _, type DeviceInfo as a, type DiscoveredDevice as b, type PairChallengeMessage as c, type PairConfirmMessage as d, type PairRejectMessage as e, type PairRequestMessage as f, type PairResponseMessage as g, type PairedDevice as h, type TextMessage as i, type FileAckMessage as j, type FileChunkMessage as k, type FileCompleteMessage as l, type FileRejectMessage as m, type FileRequestMessage as n, type FileTransfer as o, type TextTransfer as p, type AppSettings as q, type ConnectionStatus as r, type FilesTransfer as s, MDNS_DOMAIN as t, MDNS_SERVICE_NAME as u, MDNS_SERVICE_TYPE as v, type MessageType as w, type PairingChallenge as x, type PairingResponse as y, type PairingStep as z };
