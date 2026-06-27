// Device and Discovery Types
export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'macos' | 'android';
  version: string;
  host: string;
  port: number;
}

export interface DiscoveredDevice extends DeviceInfo {
  lastSeen: number;
}

export interface PairedDevice extends DeviceInfo {
  sharedSecret: string; // Base64 encoded
  pairedAt: number;
  lastConnected?: number;
}

// Pairing Types
export interface PairingChallenge {
  challenge: string; // Base64 encoded random bytes
  timestamp: number;
}

export interface PairingResponse {
  response: string; // Base64 encoded HMAC
  deviceInfo: DeviceInfo;
}

export type PairingStatus = 'idle' | 'waiting' | 'verifying' | 'success' | 'failed';

// Transfer Types
export type TransferType = 'text' | 'file' | 'files';

export interface TransferMetadata {
  id: string;
  type: TransferType;
  timestamp: number;
  direction: 'send' | 'receive';
  deviceId: string;
  deviceName: string;
}

export interface TextTransfer extends TransferMetadata {
  type: 'text';
  content: string;
}

export interface FileTransfer extends TransferMetadata {
  type: 'file';
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath?: string; // Local path after receiving
  durationMs?: number; // Transfer duration in milliseconds
  speedBytesPerSec?: number; // Transfer speed in bytes per second
}

export interface FilesTransfer extends TransferMetadata {
  type: 'files';
  files: Array<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    filePath?: string;
  }>;
  totalSize: number;
}

export type Transfer = TextTransfer | FileTransfer | FilesTransfer;

export interface TransferProgress {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  currentFile?: string;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  elapsedMs?: number;
}

export interface TransferQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  progress: number;
  direction: 'send' | 'receive';
}

// Message Protocol Types
export type MessageType =
  | 'ping'
  | 'pong'
  | 'pair_request'
  | 'pair_challenge'
  | 'pair_response'
  | 'pair_confirm'
  | 'pair_reject'
  | 'hello'
  | 'text'
  | 'file_request'
  | 'file_accept'
  | 'file_reject'
  | 'file_chunk'
  | 'file_complete'
  | 'file_ack'
  | 'app'
  | 'error';

export interface Message {
  type: MessageType;
  id: string;
  timestamp: number;
  payload?: unknown;
}

/** Generic encrypted application message: a channel name + arbitrary payload.
 * Lets features (memory sync, clipboard sync, ...) ride the paired channel
 * without each needing its own protocol message type. */
export interface AppMessage extends Message {
  type: 'app';
  payload: {
    channel: string;
    data: unknown;
  };
}

/** Reconnect greeting: identifies the device so an already-paired peer can
 * resume with the stored shared secret, skipping the pairing handshake. */
export interface HelloMessage extends Message {
  type: 'hello';
  payload: {
    deviceInfo: DeviceInfo;
  };
}

export interface PingMessage extends Message {
  type: 'ping';
}

export interface PongMessage extends Message {
  type: 'pong';
}

export interface PairRequestMessage extends Message {
  type: 'pair_request';
  payload: {
    deviceInfo: DeviceInfo;
  };
}

export interface PairChallengeMessage extends Message {
  type: 'pair_challenge';
  payload: PairingChallenge;
}

export interface PairResponseMessage extends Message {
  type: 'pair_response';
  payload: PairingResponse;
}

export interface PairConfirmMessage extends Message {
  type: 'pair_confirm';
  payload: {
    deviceInfo: DeviceInfo;
  };
}

export interface PairRejectMessage extends Message {
  type: 'pair_reject';
  payload: {
    reason: string;
  };
}

export interface TextMessage extends Message {
  type: 'text';
  payload: {
    content: string;
  };
}

export interface FileRequestMessage extends Message {
  type: 'file_request';
  payload: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    checksum: string;
    httpUrl?: string;
  };
}

export interface FileAcceptMessage extends Message {
  type: 'file_accept';
  payload: {
    requestId: string;
    uploadUrl?: string;
  };
}

export interface FileRejectMessage extends Message {
  type: 'file_reject';
  payload: {
    requestId: string;
    reason: string;
  };
}

export interface FileChunkMessage extends Message {
  type: 'file_chunk';
  payload: {
    requestId: string;
    chunkIndex: number;
    totalChunks: number;
    data: string; // Base64 encoded
  };
}

export interface FileCompleteMessage extends Message {
  type: 'file_complete';
  payload: {
    requestId: string;
    checksum: string;
  };
}

export interface FileAckMessage extends Message {
  type: 'file_ack';
  payload: {
    requestId: string;
    success: boolean;
  };
}

export interface ErrorMessage extends Message {
  type: 'error';
  payload: {
    code: string;
    message: string;
    originalMessageId?: string;
  };
}

// Connection Types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'pairing';

export type PairingStep =
  | 'idle'
  | 'connecting'
  | 'sending_request'
  | 'waiting_for_passphrase'
  | 'deriving_key'
  | 'sending_challenge'
  | 'waiting_for_challenge'
  | 'responding_to_challenge'
  | 'verifying_response'
  | 'confirming'
  | 'success'
  | 'failed';

export interface ConnectionState {
  status: ConnectionStatus;
  device?: DeviceInfo;
  error?: string;
  /** Verbose status message for UI display */
  statusMessage?: string;
  /** Current step in the pairing process */
  pairingStep?: PairingStep;
}

// Storage Types
export interface AppSettings {
  deviceName: string;
  deviceId: string;
  autoAcceptFromPaired: boolean;
  saveDirectory: string;
  notificationsEnabled: boolean;
}

export interface StoredData {
  settings: AppSettings;
  pairedDevices: PairedDevice[];
  transferHistory: Transfer[];
}
