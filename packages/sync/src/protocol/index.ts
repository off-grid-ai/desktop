import type { Message } from '../types';
import { encrypt, decrypt, encodeBase64, decodeBase64 } from '../crypto';

// Protocol version for compatibility checking
export const PROTOCOL_VERSION = '1.0.0';

// Message header format: [length (4 bytes)] [type (1 byte)] [payload]
export const HEADER_LENGTH = 5;
export const MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB max message

// Message type byte codes
export const MESSAGE_TYPE_CODES: Record<string, number> = {
  ping: 0x01,
  pong: 0x02,
  pair_request: 0x10,
  pair_challenge: 0x11,
  pair_response: 0x12,
  pair_confirm: 0x13,
  pair_reject: 0x14,
  hello: 0x15,
  text: 0x20,
  file_request: 0x30,
  file_accept: 0x31,
  file_reject: 0x32,
  file_chunk: 0x33,
  file_complete: 0x34,
  file_ack: 0x35,
  app: 0x40,
  error: 0xff,
};

/** Build a reconnect hello identifying the local device. */
export function createHello(deviceInfo: unknown): Message {
  return {
    type: 'hello',
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
    payload: { deviceInfo },
  };
}

/** Build a generic encrypted application message for a named channel. */
export function createAppMessage(channel: string, data: unknown): Message {
  return {
    type: 'app',
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
    payload: { channel, data },
  };
}

// Reverse lookup
export const MESSAGE_CODE_TYPES: Record<number, string> = Object.fromEntries(
  Object.entries(MESSAGE_TYPE_CODES).map(([k, v]) => [v, k])
);

/**
 * Serialize a message to a buffer for transmission
 */
export function serializeMessage(message: Message): Uint8Array {
  const jsonPayload = JSON.stringify(message);
  const payloadBytes = new TextEncoder().encode(jsonPayload);
  const typeCode = MESSAGE_TYPE_CODES[message.type] || 0xff;

  // Create buffer: 4 bytes length + 1 byte type + payload
  const buffer = new Uint8Array(HEADER_LENGTH + payloadBytes.length);
  const view = new DataView(buffer.buffer);

  // Write length (big-endian)
  view.setUint32(0, payloadBytes.length, false);

  // Write type code
  buffer[4] = typeCode;

  // Write payload
  buffer.set(payloadBytes, HEADER_LENGTH);

  return buffer;
}

/**
 * Deserialize a message from a buffer
 */
export function deserializeMessage(buffer: Uint8Array): Message | null {
  if (buffer.length < HEADER_LENGTH) {
    return null;
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset);
  const payloadLength = view.getUint32(0, false);

  if (buffer.length < HEADER_LENGTH + payloadLength) {
    return null;
  }

  const payloadBytes = buffer.slice(HEADER_LENGTH, HEADER_LENGTH + payloadLength);
  const jsonPayload = new TextDecoder().decode(payloadBytes);

  try {
    return JSON.parse(jsonPayload) as Message;
  } catch {
    return null;
  }
}

/**
 * Get the expected message length from a header
 */
export function getMessageLength(header: Uint8Array): number | null {
  if (header.length < 4) {
    return null;
  }

  const view = new DataView(header.buffer, header.byteOffset);
  const length = view.getUint32(0, false);

  if (length > MAX_MESSAGE_SIZE) {
    return null; // Message too large
  }

  return HEADER_LENGTH + length;
}

/**
 * Encrypt a message for transmission over an established connection
 */
export function encryptMessage(
  message: Message,
  secretKey: string
): { encrypted: Uint8Array; nonce: string } {
  const serialized = serializeMessage(message);
  const { encrypted, nonce } = encrypt(serialized, secretKey);
  return {
    encrypted: decodeBase64(encrypted),
    nonce,
  };
}

/**
 * Decrypt a received encrypted message
 */
export function decryptMessage(
  encrypted: Uint8Array,
  nonce: string,
  secretKey: string
): Message | null {
  const decrypted = decrypt(encodeBase64(encrypted), nonce, secretKey);
  if (!decrypted) return null;
  return deserializeMessage(decrypted);
}

/**
 * Message frame for encrypted transmission
 * Format: [nonce length (1 byte)] [nonce] [encrypted data]
 */
export function createEncryptedFrame(encrypted: Uint8Array, nonce: string): Uint8Array {
  const nonceBytes = decodeBase64(nonce);
  const frame = new Uint8Array(1 + nonceBytes.length + encrypted.length);

  frame[0] = nonceBytes.length;
  frame.set(nonceBytes, 1);
  frame.set(encrypted, 1 + nonceBytes.length);

  return frame;
}

/**
 * Parse an encrypted frame
 */
export function parseEncryptedFrame(
  frame: Uint8Array
): { encrypted: Uint8Array; nonce: string } | null {
  if (frame.length < 2) return null;

  const nonceLength = frame[0];
  if (frame.length < 1 + nonceLength) return null;

  const nonceBytes = frame.slice(1, 1 + nonceLength);
  const encrypted = frame.slice(1 + nonceLength);

  return {
    encrypted,
    nonce: encodeBase64(nonceBytes),
  };
}

/**
 * Buffer for accumulating incoming data and extracting complete messages
 */
export class MessageBuffer {
  private buffer: Uint8Array = new Uint8Array(0);

  /**
   * Add data to the buffer
   */
  append(data: Uint8Array): void {
    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
  }

  /**
   * Try to extract a complete message from the buffer
   */
  extractMessage(): Message | null {
    const length = getMessageLength(this.buffer);
    if (length === null || this.buffer.length < length) {
      return null;
    }

    const messageBytes = this.buffer.slice(0, length);
    this.buffer = this.buffer.slice(length);

    return deserializeMessage(messageBytes);
  }

  /**
   * Extract all complete messages from the buffer
   */
  extractAllMessages(): Message[] {
    const messages: Message[] = [];
    let message: Message | null;

    while ((message = this.extractMessage()) !== null) {
      messages.push(message);
    }

    return messages;
  }

  /**
   * Get current buffer size
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = new Uint8Array(0);
  }
}

/**
 * Create a ping message
 */
export function createPingMessage(): Message {
  return {
    type: 'ping',
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
  };
}

/**
 * Create a pong message in response to a ping
 */
export function createPongMessage(pingId: string): Message {
  return {
    type: 'pong',
    id: pingId,
    timestamp: Date.now(),
  };
}

/**
 * Create an error message
 */
export function createErrorMessage(
  code: string,
  errorMessage: string,
  originalMessageId?: string
): Message {
  return {
    type: 'error',
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
    payload: {
      code,
      message: errorMessage,
      originalMessageId,
    },
  };
}
