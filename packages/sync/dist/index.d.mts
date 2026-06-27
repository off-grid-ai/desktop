import { P as PairingStatus, a as DeviceInfo, c as PairChallengeMessage, d as PairConfirmMessage, e as PairRejectMessage, f as PairRequestMessage, g as PairResponseMessage, h as PairedDevice, M as Message, T as TransferProgress, i as TextMessage, F as FileAcceptMessage, j as FileAckMessage, k as FileChunkMessage, l as FileCompleteMessage, m as FileRejectMessage, n as FileRequestMessage, o as FileTransfer, p as TextTransfer, D as DiscoveryService, b as DiscoveredDevice } from './index-U2pbAoxU.mjs';
export { A as AppMessage, q as AppSettings, C as ConnectionState, r as ConnectionStatus, E as ErrorMessage, s as FilesTransfer, H as HelloMessage, t as MDNS_DOMAIN, u as MDNS_SERVICE_NAME, v as MDNS_SERVICE_TYPE, w as MessageType, x as PairingChallenge, y as PairingResponse, z as PairingStep, B as PingMessage, G as PongMessage, S as StoredData, I as TXT_DEVICE_ID, J as TXT_DEVICE_NAME, K as TXT_PLATFORM, L as TXT_VERSION, N as Transfer, O as TransferMetadata, Q as TransferQueueItem, R as TransferType, U as createDiscoveredDevice, V as createTxtRecord, W as filterStaleDevices, X as isDeviceStale, Y as parseTxtRecord, Z as removeDevice, _ as updateDeviceList } from './index-U2pbAoxU.mjs';
import { T as TransportBridge, S as SyncConnection } from './transport-1cXLtrs5.mjs';
export { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util';

/**
 * Generate a random device ID
 */
declare function generateDeviceId(): string;
/**
 * Generate a random message ID
 */
declare function generateMessageId(): string;
/**
 * Simple PBKDF2-like key derivation using iterated hashing
 * Note: This is a simplified implementation using NaCl primitives
 */
declare function deriveKey(passphrase: string, salt: Uint8Array, iterations?: number): Uint8Array;
/**
 * Derive a shared secret from a passphrase and two device IDs
 * This ensures both devices derive the same key
 */
declare function deriveSharedSecret(passphrase: string, deviceId1: string, deviceId2: string): string;
/**
 * Generate a random challenge for pairing verification
 */
declare function generateChallenge(): string;
/**
 * Create an HMAC-like response to a challenge using the shared secret
 */
declare function createChallengeResponse(challenge: string, sharedSecret: string): string;
/**
 * Verify a challenge response
 */
declare function verifyChallengeResponse(challenge: string, response: string, sharedSecret: string): boolean;
/**
 * Encrypt data using NaCl secretbox (XSalsa20-Poly1305)
 */
declare function encrypt(data: string | Uint8Array, secretKey: string): {
    encrypted: string;
    nonce: string;
};
/**
 * Decrypt data using NaCl secretbox
 */
declare function decrypt(encrypted: string, nonce: string, secretKey: string): Uint8Array | null;
/**
 * Decrypt data and return as string
 */
declare function decryptToString(encrypted: string, nonce: string, secretKey: string): string | null;
/**
 * Calculate a checksum for file integrity verification
 */
declare function calculateChecksum(data: Uint8Array): string;
/**
 * Verify a checksum
 */
declare function verifyChecksum(data: Uint8Array, checksum: string): boolean;
/**
 * Incremental/streaming checksum calculator using SHA-512.
 * Produces the same output format as calculateChecksum() (base64 of first 16 bytes of SHA-512)
 * but allows feeding data in chunks to avoid loading entire files into memory.
 */
declare class IncrementalChecksum {
    private hasher;
    constructor();
    /**
     * Feed a chunk of data into the hash
     */
    update(data: Uint8Array): void;
    /**
     * Finalize and return checksum in the same format as calculateChecksum()
     * (base64 of first 16 bytes of SHA-512 digest)
     */
    digest(): string;
}

/**
 * Pairing state machine for managing the pairing handshake
 */
interface PairingState {
    status: PairingStatus;
    localDevice: DeviceInfo;
    remoteDevice?: DeviceInfo;
    passphrase?: string;
    sharedSecret?: string;
    challenge?: string;
    error?: string;
}
/**
 * Create initial pairing state
 */
declare function createPairingState(localDevice: DeviceInfo): PairingState;
/**
 * Create a pair request message
 */
declare function createPairRequest(localDevice: DeviceInfo): PairRequestMessage;
/**
 * Create a pair challenge message
 */
declare function createPairChallenge(): PairChallengeMessage;
/**
 * Create a pair response message
 */
declare function createPairResponse(challenge: string, sharedSecret: string, localDevice: DeviceInfo): PairResponseMessage;
/**
 * Create a pair confirm message
 */
declare function createPairConfirm(localDevice: DeviceInfo): PairConfirmMessage;
/**
 * Create a pair reject message
 */
declare function createPairReject(reason: string): PairRejectMessage;
/**
 * Handle pairing state transitions
 */
declare function handlePairingMessage(state: PairingState, message: Message, passphrase?: string): {
    newState: PairingState;
    response?: Message;
};
/**
 * Create a PairedDevice from successful pairing
 */
declare function createPairedDevice(state: PairingState): PairedDevice | null;
/**
 * Check if a device is already paired
 */
declare function isPaired(deviceId: string, pairedDevices: PairedDevice[]): boolean;
/**
 * Get a paired device by ID
 */
declare function getPairedDevice(deviceId: string, pairedDevices: PairedDevice[]): PairedDevice | undefined;
/**
 * Update last connected time for a paired device
 */
declare function updateLastConnected(deviceId: string, pairedDevices: PairedDevice[]): PairedDevice[];
/**
 * Remove a paired device
 */
declare function removePairedDevice(deviceId: string, pairedDevices: PairedDevice[]): PairedDevice[];

declare const CHUNK_SIZE: number;
declare const MAX_TEXT_LENGTH: number;
/**
 * Create a text transfer record
 */
declare function createTextTransfer(content: string, device: DeviceInfo, direction: 'send' | 'receive'): TextTransfer;
/**
 * Create a file transfer record
 */
declare function createFileTransfer(fileName: string, fileSize: number, mimeType: string, device: DeviceInfo, direction: 'send' | 'receive', durationMs?: number): FileTransfer;
/**
 * Create a text message
 */
declare function createTextMessage(content: string): TextMessage;
/**
 * Create an encrypted text message
 */
declare function createEncryptedTextMessage(content: string, secretKey: string): {
    message: TextMessage;
    nonce: string;
};
/**
 * Decrypt a text message
 */
declare function decryptTextMessage(message: TextMessage, nonce: string, secretKey: string): string | null;
/**
 * Create a file request message
 */
declare function createFileRequest(fileName: string, fileSize: number, mimeType: string, fileData: Uint8Array): FileRequestMessage;
/**
 * Create a file request message with a pre-computed checksum (for streaming/large files).
 * Avoids needing the entire file in memory.
 */
declare function createFileRequestStreaming(fileName: string, fileSize: number, mimeType: string, checksum: string): FileRequestMessage;
/**
 * Create a file complete message with a pre-computed checksum (for streaming/large files).
 * Avoids needing the entire file in memory.
 */
declare function createFileCompleteStreaming(requestId: string, checksum: string): FileCompleteMessage;
/**
 * Create a file request message with an HTTP download URL (for large files sent via HTTP).
 */
declare function createFileRequestHttp(fileName: string, fileSize: number, mimeType: string, checksum: string, httpUrl: string): FileRequestMessage;
/**
 * Create a file accept message
 */
declare function createFileAccept(requestId: string): FileAcceptMessage;
/**
 * Create a file accept message with an HTTP upload URL (for receiving large files via HTTP).
 */
declare function createFileAcceptHttp(requestId: string, uploadUrl: string): FileAcceptMessage;
/**
 * Create a file ack message (sent after HTTP transfer completes).
 */
declare function createFileAck(requestId: string, success: boolean): FileAckMessage;
/**
 * Create a file reject message
 */
declare function createFileReject(requestId: string, reason: string): FileRejectMessage;
/**
 * Create a file chunk message
 */
declare function createFileChunk(requestId: string, chunkIndex: number, totalChunks: number, data: Uint8Array): FileChunkMessage;
/**
 * Create a file chunk message from already-base64-encoded data.
 * Avoids the decode → re-encode roundtrip when data is read as base64 from disk.
 */
declare function createFileChunkFromBase64(requestId: string, chunkIndex: number, totalChunks: number, base64Data: string): FileChunkMessage;
/**
 * Create a file complete message
 */
declare function createFileComplete(requestId: string, fileData: Uint8Array): FileCompleteMessage;
/**
 * Split file data into chunks
 */
declare function chunkFile(data: Uint8Array, chunkSize?: number): Generator<{
    chunk: Uint8Array;
    index: number;
    total: number;
}>;
/**
 * Reassemble chunks into complete file data
 */
declare function reassembleChunks(chunks: Map<number, Uint8Array>, totalChunks: number): Uint8Array | null;
/**
 * Calculate transfer progress with optional speed/ETA computation
 */
declare function calculateProgress(transferId: string, bytesTransferred: number, totalBytes: number, currentFile?: string, startTime?: number): TransferProgress;
/**
 * Verify received file integrity
 */
declare function verifyFileIntegrity(data: Uint8Array, expectedChecksum: string): boolean;
/**
 * Format file size for display
 */
declare function formatFileSize(bytes: number): string;
/**
 * Format transfer speed for display
 */
declare function formatTransferSpeed(bytesPerSec: number): string;
/**
 * Format transfer duration for display
 */
declare function formatDuration(ms: number): string;
/**
 * Format ETA for display
 */
declare function formatEta(seconds: number): string;
/**
 * Format live transfer progress info string (speed · elapsed · ETA)
 */
declare function formatProgressInfo(progress: TransferProgress): string;
/**
 * Get MIME type from file extension
 */
declare function getMimeType(fileName: string): string;

declare const PROTOCOL_VERSION = "1.0.0";
declare const HEADER_LENGTH = 5;
declare const MAX_MESSAGE_SIZE: number;
declare const MESSAGE_TYPE_CODES: Record<string, number>;
/** Build a reconnect hello identifying the local device. */
declare function createHello(deviceInfo: unknown): Message;
/** Build a generic encrypted application message for a named channel. */
declare function createAppMessage(channel: string, data: unknown): Message;
declare const MESSAGE_CODE_TYPES: Record<number, string>;
/**
 * Serialize a message to a buffer for transmission
 */
declare function serializeMessage(message: Message): Uint8Array;
/**
 * Deserialize a message from a buffer
 */
declare function deserializeMessage(buffer: Uint8Array): Message | null;
/**
 * Get the expected message length from a header
 */
declare function getMessageLength(header: Uint8Array): number | null;
/**
 * Encrypt a message for transmission over an established connection
 */
declare function encryptMessage(message: Message, secretKey: string): {
    encrypted: Uint8Array;
    nonce: string;
};
/**
 * Decrypt a received encrypted message
 */
declare function decryptMessage(encrypted: Uint8Array, nonce: string, secretKey: string): Message | null;
/**
 * Message frame for encrypted transmission
 * Format: [nonce length (1 byte)] [nonce] [encrypted data]
 */
declare function createEncryptedFrame(encrypted: Uint8Array, nonce: string): Uint8Array;
/**
 * Parse an encrypted frame
 */
declare function parseEncryptedFrame(frame: Uint8Array): {
    encrypted: Uint8Array;
    nonce: string;
} | null;
/**
 * Buffer for accumulating incoming data and extracting complete messages
 */
declare class MessageBuffer {
    private buffer;
    /**
     * Add data to the buffer
     */
    append(data: Uint8Array): void;
    /**
     * Try to extract a complete message from the buffer
     */
    extractMessage(): Message | null;
    /**
     * Extract all complete messages from the buffer
     */
    extractAllMessages(): Message[];
    /**
     * Get current buffer size
     */
    get size(): number;
    /**
     * Clear the buffer
     */
    clear(): void;
}
/**
 * Create a ping message
 */
declare function createPingMessage(): Message;
/**
 * Create a pong message in response to a ping
 */
declare function createPongMessage(pingId: string): Message;
/**
 * Create an error message
 */
declare function createErrorMessage(code: string, errorMessage: string, originalMessageId?: string): Message;

declare const FRAME_HEADER_LENGTH = 4;
declare const MAX_FRAME_SIZE: number;
declare const FRAME_KIND_PLAINTEXT = 0;
declare const FRAME_KIND_ENCRYPTED = 1;
/** Encode a plaintext (unencrypted) message frame, used for pairing. */
declare function encodePlaintextFrame(message: Message): Uint8Array;
/** Encode an encrypted message frame using the per-pair shared secret. */
declare function encodeEncryptedFrame(message: Message, secretKey: string): Uint8Array;
type DecodedFrame = {
    kind: 'plaintext';
    message: Message;
} | {
    kind: 'encrypted';
    message: Message;
};
/** Decode one frame body. `secretKey` is required to read encrypted frames. */
declare function decodeFrameBody(body: Uint8Array, secretKey?: string): DecodedFrame | null;
/**
 * Accumulates incoming bytes and yields complete frame bodies. The shared
 * secret can be set once pairing succeeds so later encrypted frames decode.
 */
declare class FrameBuffer {
    private buffer;
    append(data: Uint8Array): void;
    /** Pull the next complete frame body, or null if none is fully buffered. */
    private nextBody;
    /** Decode all complete frames currently buffered. */
    drain(secretKey?: string): DecodedFrame[];
}

declare const FREE_DEVICE_CAP = 2;
interface DeviceCapPolicy {
    /** Max distinct paired devices allowed. Free returns FREE_DEVICE_CAP; a pro
     * entitlement returns a higher number or Infinity. */
    limit(): number;
}
/** A fixed free-tier policy. */
declare const freePolicy: DeviceCapPolicy;
/** Build a policy from a pro flag supplied by the host's entitlement check. */
declare function policyFor(isPro: boolean, proLimit?: number): DeviceCapPolicy;
interface DeviceCap {
    policy: DeviceCapPolicy;
    /** How many distinct devices are already paired (from the host's store). */
    pairedCount: () => number;
    /** Whether this device id is already paired (re-pairing does not count). */
    isKnown: (deviceId: string) => boolean;
}
/** True if pairing with `deviceId` is allowed under the cap. */
declare function pairingAllowed(cap: DeviceCap | undefined, deviceId: string): boolean;

interface SyncEngineOptions {
    localDevice: DeviceInfo;
    transport: TransportBridge;
    /** Supply the passphrase for an incoming pairing (e.g. a UI prompt). Return
     * null/undefined to refuse. Not needed on the side that calls connect(). */
    getPassphrase?: (remote: DeviceInfo) => Promise<string | null | undefined> | string | null | undefined;
    /** Application message from a paired peer (pairing traffic is handled internally). */
    onMessage?: (deviceId: string, message: Message) => void;
    /** Generic app-channel message from a paired peer (type 'app'). Used by
     * features like memory/clipboard sync that ride the paired channel. */
    onAppMessage?: (deviceId: string, channel: string, data: unknown) => void;
    /** Look up the stored shared secret for an already-paired device, so an
     * inbound reconnect (hello) can resume without re-running the handshake. */
    getSharedSecret?: (deviceId: string) => string | undefined;
    /** A pairing handshake completed. */
    onPaired?: (device: PairedDevice) => void;
    /** A pairing attempt failed. */
    onPairingFailed?: (remote: DeviceInfo | undefined, error: string) => void;
    /** Optional device cap (open-core 2 free / 3+ paid). When set, pairing a new
     * device beyond the limit is refused on both the dialing and accepting side. */
    cap?: DeviceCap;
}
/** One peer connection: owns its frame buffer, pairing state, and shared secret. */
declare class PeerSession {
    readonly conn: SyncConnection;
    private readonly engine;
    private readonly opts;
    private buffer;
    private pairing;
    private sharedSecret?;
    private passphrase?;
    private resumeSecret?;
    private helloSent;
    private queue;
    remoteDevice?: DeviceInfo;
    constructor(conn: SyncConnection, engine: SyncEngine, opts: SyncEngineOptions, initiateWith?: {
        remote: DeviceInfo;
        passphrase: string;
    }, resumeWith?: {
        remote: DeviceInfo;
        sharedSecret: string;
    });
    get pairedSecret(): string | undefined;
    /** Send an application message to this peer (must be paired). */
    sendMessage(message: Message): boolean;
    private sendPlain;
    private onData;
    private route;
    /** Resume an already-paired device using the stored secret (no handshake). */
    private handleHello;
    private handlePairing;
}
declare class SyncEngine {
    private readonly opts;
    private sessions;
    private paired;
    constructor(opts: SyncEngineOptions);
    /** Start accepting inbound connections on `port`. */
    start(port: number): Promise<void>;
    /** Dial a discovered device and begin pairing with `passphrase`. Refuses if
     * pairing a new device would exceed the device cap. */
    pair(device: DeviceInfo, passphrase: string): Promise<void>;
    /** Reconnect to an already-paired device using its stored shared secret,
     * skipping the pairing handshake. Used for auto-reconnect on discovery. */
    reconnect(device: DeviceInfo, sharedSecret: string): Promise<void>;
    /** Send an application message to an already-paired device. */
    send(deviceId: string, message: Message): boolean;
    /** Send a generic app-channel message (encrypted) to a paired device. */
    sendApp(deviceId: string, channel: string, data: unknown): boolean;
    isPaired(deviceId: string): boolean;
    stop(): Promise<void>;
    /** @internal */
    _registerPaired(deviceId: string, session: PeerSession): void;
    /** @internal */
    _removeSession(session: PeerSession): void;
}

/** The slice of SyncEngine the orchestrator drives. */
interface ReconnectingEngine {
    isPaired(deviceId: string): boolean;
    reconnect(device: DeviceInfo, sharedSecret: string): Promise<void>;
}
interface DiscoveryOrchestratorOptions {
    engine: ReconnectingEngine;
    discovery: DiscoveryService;
    localDevice: DeviceInfo;
    /** Stored shared secret for a device, or undefined if not yet paired. */
    getSharedSecret: (deviceId: string) => string | undefined;
    /** A discovered device we have no secret for - surface it so the UI can pair. */
    onDiscovered?: (device: DiscoveredDevice) => void;
    /** A previously discovered device went away. */
    onLost?: (deviceId: string) => void;
}
declare class DiscoveryOrchestrator {
    private readonly opts;
    private connecting;
    constructor(opts: DiscoveryOrchestratorOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleFound;
}

declare const VERSION = "0.0.1";
declare const APP_NAME = "Off Grid Sync";

export { APP_NAME, CHUNK_SIZE, type DecodedFrame, type DeviceCap, type DeviceCapPolicy, DeviceInfo, DiscoveredDevice, DiscoveryOrchestrator, type DiscoveryOrchestratorOptions, DiscoveryService, FRAME_HEADER_LENGTH, FRAME_KIND_ENCRYPTED, FRAME_KIND_PLAINTEXT, FREE_DEVICE_CAP, FileAcceptMessage, FileAckMessage, FileChunkMessage, FileCompleteMessage, FileRejectMessage, FileRequestMessage, FileTransfer, FrameBuffer, HEADER_LENGTH, IncrementalChecksum, MAX_FRAME_SIZE, MAX_MESSAGE_SIZE, MAX_TEXT_LENGTH, MESSAGE_CODE_TYPES, MESSAGE_TYPE_CODES, Message, MessageBuffer, PROTOCOL_VERSION, PairChallengeMessage, PairConfirmMessage, PairRejectMessage, PairRequestMessage, PairResponseMessage, PairedDevice, type PairingState, PairingStatus, type ReconnectingEngine, SyncConnection, SyncEngine, type SyncEngineOptions, TextMessage, TextTransfer, TransferProgress, TransportBridge, VERSION, calculateChecksum, calculateProgress, chunkFile, createAppMessage, createChallengeResponse, createEncryptedFrame, createEncryptedTextMessage, createErrorMessage, createFileAccept, createFileAcceptHttp, createFileAck, createFileChunk, createFileChunkFromBase64, createFileComplete, createFileCompleteStreaming, createFileReject, createFileRequest, createFileRequestHttp, createFileRequestStreaming, createFileTransfer, createHello, createPairChallenge, createPairConfirm, createPairReject, createPairRequest, createPairResponse, createPairedDevice, createPairingState, createPingMessage, createPongMessage, createTextMessage, createTextTransfer, decodeFrameBody, decrypt, decryptMessage, decryptTextMessage, decryptToString, deriveKey, deriveSharedSecret, deserializeMessage, encodeEncryptedFrame, encodePlaintextFrame, encrypt, encryptMessage, formatDuration, formatEta, formatFileSize, formatProgressInfo, formatTransferSpeed, freePolicy, generateChallenge, generateDeviceId, generateMessageId, getMessageLength, getMimeType, getPairedDevice, handlePairingMessage, isPaired, pairingAllowed, parseEncryptedFrame, policyFor, reassembleChunks, removePairedDevice, serializeMessage, updateLastConnected, verifyChallengeResponse, verifyChecksum, verifyFileIntegrity };
