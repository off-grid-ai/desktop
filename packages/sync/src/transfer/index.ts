import type {
  TextTransfer,
  FileTransfer,
  TransferProgress,
  TextMessage,
  FileRequestMessage,
  FileAcceptMessage,
  FileRejectMessage,
  FileChunkMessage,
  FileCompleteMessage,
  FileAckMessage,
  DeviceInfo,
} from '../types';
import {
  generateMessageId,
  encrypt,
  decrypt,
  calculateChecksum,
  verifyChecksum,
  encodeBase64,
  decodeBase64,
} from '../crypto';

// Constants
export const CHUNK_SIZE = 64 * 1024; // 64KB chunks
export const MAX_TEXT_LENGTH = 1024 * 1024; // 1MB max text

/**
 * Create a text transfer record
 */
export function createTextTransfer(
  content: string,
  device: DeviceInfo,
  direction: 'send' | 'receive'
): TextTransfer {
  return {
    id: generateMessageId(),
    type: 'text',
    timestamp: Date.now(),
    direction,
    deviceId: device.id,
    deviceName: device.name,
    content,
  };
}

/**
 * Create a file transfer record
 */
export function createFileTransfer(
  fileName: string,
  fileSize: number,
  mimeType: string,
  device: DeviceInfo,
  direction: 'send' | 'receive',
  durationMs?: number
): FileTransfer {
  const transfer: FileTransfer = {
    id: generateMessageId(),
    type: 'file',
    timestamp: Date.now(),
    direction,
    deviceId: device.id,
    deviceName: device.name,
    fileName,
    fileSize,
    mimeType,
  };
  if (durationMs != null && durationMs > 0) {
    transfer.durationMs = durationMs;
    transfer.speedBytesPerSec = Math.round((fileSize / durationMs) * 1000);
  }
  return transfer;
}

/**
 * Create a text message
 */
export function createTextMessage(content: string): TextMessage {
  return {
    type: 'text',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      content,
    },
  };
}

/**
 * Create an encrypted text message
 */
export function createEncryptedTextMessage(
  content: string,
  secretKey: string
): { message: TextMessage; nonce: string } {
  const { encrypted, nonce } = encrypt(content, secretKey);
  return {
    message: createTextMessage(encrypted),
    nonce,
  };
}

/**
 * Decrypt a text message
 */
export function decryptTextMessage(
  message: TextMessage,
  nonce: string,
  secretKey: string
): string | null {
  const decrypted = decrypt(message.payload.content, nonce, secretKey);
  if (!decrypted) return null;
  return new TextDecoder().decode(decrypted);
}

/**
 * Create a file request message
 */
export function createFileRequest(
  fileName: string,
  fileSize: number,
  mimeType: string,
  fileData: Uint8Array
): FileRequestMessage {
  return {
    type: 'file_request',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      fileName,
      fileSize,
      mimeType,
      checksum: calculateChecksum(fileData),
    },
  };
}

/**
 * Create a file request message with a pre-computed checksum (for streaming/large files).
 * Avoids needing the entire file in memory.
 */
export function createFileRequestStreaming(
  fileName: string,
  fileSize: number,
  mimeType: string,
  checksum: string
): FileRequestMessage {
  return {
    type: 'file_request',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      fileName,
      fileSize,
      mimeType,
      checksum,
    },
  };
}

/**
 * Create a file complete message with a pre-computed checksum (for streaming/large files).
 * Avoids needing the entire file in memory.
 */
export function createFileCompleteStreaming(requestId: string, checksum: string): FileCompleteMessage {
  return {
    type: 'file_complete',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      checksum,
    },
  };
}

/**
 * Create a file request message with an HTTP download URL (for large files sent via HTTP).
 */
export function createFileRequestHttp(
  fileName: string,
  fileSize: number,
  mimeType: string,
  checksum: string,
  httpUrl: string
): FileRequestMessage {
  return {
    type: 'file_request',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      fileName,
      fileSize,
      mimeType,
      checksum,
      httpUrl,
    },
  };
}

/**
 * Create a file accept message
 */
export function createFileAccept(requestId: string): FileAcceptMessage {
  return {
    type: 'file_accept',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
    },
  };
}

/**
 * Create a file accept message with an HTTP upload URL (for receiving large files via HTTP).
 */
export function createFileAcceptHttp(requestId: string, uploadUrl: string): FileAcceptMessage {
  return {
    type: 'file_accept',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      uploadUrl,
    },
  };
}

/**
 * Create a file ack message (sent after HTTP transfer completes).
 */
export function createFileAck(requestId: string, success: boolean): FileAckMessage {
  return {
    type: 'file_ack',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      success,
    },
  };
}

/**
 * Create a file reject message
 */
export function createFileReject(requestId: string, reason: string): FileRejectMessage {
  return {
    type: 'file_reject',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      reason,
    },
  };
}

/**
 * Create a file chunk message
 */
export function createFileChunk(
  requestId: string,
  chunkIndex: number,
  totalChunks: number,
  data: Uint8Array
): FileChunkMessage {
  return {
    type: 'file_chunk',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      chunkIndex,
      totalChunks,
      data: encodeBase64(data),
    },
  };
}

/**
 * Create a file chunk message from already-base64-encoded data.
 * Avoids the decode → re-encode roundtrip when data is read as base64 from disk.
 */
export function createFileChunkFromBase64(
  requestId: string,
  chunkIndex: number,
  totalChunks: number,
  base64Data: string
): FileChunkMessage {
  return {
    type: 'file_chunk',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      chunkIndex,
      totalChunks,
      data: base64Data,
    },
  };
}

/**
 * Create a file complete message
 */
export function createFileComplete(requestId: string, fileData: Uint8Array): FileCompleteMessage {
  return {
    type: 'file_complete',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      checksum: calculateChecksum(fileData),
    },
  };
}

/**
 * Split file data into chunks
 */
export function* chunkFile(
  data: Uint8Array,
  chunkSize: number = CHUNK_SIZE
): Generator<{ chunk: Uint8Array; index: number; total: number }> {
  const totalChunks = Math.ceil(data.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    yield {
      chunk: data.slice(start, end),
      index: i,
      total: totalChunks,
    };
  }
}

/**
 * Reassemble chunks into complete file data
 */
export function reassembleChunks(
  chunks: Map<number, Uint8Array>,
  totalChunks: number
): Uint8Array | null {
  // Verify all chunks are present
  if (chunks.size !== totalChunks) {
    return null;
  }

  // Calculate total size
  let totalSize = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks.get(i);
    if (!chunk) return null;
    totalSize += chunk.length;
  }

  // Reassemble
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks.get(i)!;
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Calculate transfer progress with optional speed/ETA computation
 */
export function calculateProgress(
  transferId: string,
  bytesTransferred: number,
  totalBytes: number,
  currentFile?: string,
  startTime?: number
): TransferProgress {
  const clampedBytes = Math.min(bytesTransferred, totalBytes);
  const result: TransferProgress = {
    transferId,
    bytesTransferred: clampedBytes,
    totalBytes,
    percentage: totalBytes > 0 ? Math.min(100, Math.round((clampedBytes / totalBytes) * 100)) : 0,
    currentFile,
  };

  if (startTime && startTime > 0) {
    const elapsedMs = Date.now() - startTime;
    result.elapsedMs = elapsedMs;
    if (elapsedMs > 500 && clampedBytes > 0) {
      result.speedBytesPerSec = Math.round((clampedBytes / elapsedMs) * 1000);
      if (result.speedBytesPerSec > 0 && clampedBytes < totalBytes) {
        const remainingBytes = totalBytes - clampedBytes;
        result.etaSeconds = Math.round(remainingBytes / result.speedBytesPerSec);
      }
    }
  }

  return result;
}

/**
 * Verify received file integrity
 */
export function verifyFileIntegrity(data: Uint8Array, expectedChecksum: string): boolean {
  return verifyChecksum(data, expectedChecksum);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format transfer speed for display
 */
export function formatTransferSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
}

/**
 * Format transfer duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Format ETA for display
 */
export function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format live transfer progress info string (speed · elapsed · ETA)
 */
export function formatProgressInfo(progress: TransferProgress): string {
  const parts: string[] = [];
  if (progress.speedBytesPerSec != null && progress.speedBytesPerSec > 0) {
    parts.push(formatTransferSpeed(progress.speedBytesPerSec));
  }
  if (progress.elapsedMs != null && progress.elapsedMs >= 1000) {
    parts.push(formatDuration(progress.elapsedMs) + ' elapsed');
  }
  if (progress.etaSeconds != null && progress.etaSeconds > 0) {
    parts.push('~' + formatEta(progress.etaSeconds) + ' left');
  }
  return parts.join(' · ');
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',
    zip: 'application/zip',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    webm: 'video/webm',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

// Re-export for convenience
export { decodeBase64 };
