// Wire codec for @offgrid/sync.
//
// One length-prefixed framing carries both the plaintext pairing handshake and
// the encrypted application traffic that follows it on the same stream:
//
//   [4-byte big-endian length L][1-byte kind][L-1 byte body]
//     kind 0x00 = plaintext : body is UTF-8 JSON of a Message
//     kind 0x01 = encrypted : body is [nonceLen:1][nonce][ciphertext],
//                 ciphertext = encryptMessage(message) (see protocol.ts)
//
// Pairing messages are sent plaintext (no shared secret yet); everything after
// a successful pairing is encrypted with the per-pair shared secret.

import type { Message } from './types';
import { encryptMessage, decryptMessage } from './protocol';
import { encodeBase64, decodeBase64 } from './crypto';

export const FRAME_HEADER_LENGTH = 4;
export const MAX_FRAME_SIZE = 16 * 1024 * 1024; // 16MB

export const FRAME_KIND_PLAINTEXT = 0x00;
export const FRAME_KIND_ENCRYPTED = 0x01;

function frame(body: Uint8Array): Uint8Array {
  const out = new Uint8Array(FRAME_HEADER_LENGTH + body.length);
  new DataView(out.buffer).setUint32(0, body.length, false);
  out.set(body, FRAME_HEADER_LENGTH);
  return out;
}

/** Encode a plaintext (unencrypted) message frame, used for pairing. */
export function encodePlaintextFrame(message: Message): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(message));
  const body = new Uint8Array(1 + json.length);
  body[0] = FRAME_KIND_PLAINTEXT;
  body.set(json, 1);
  return frame(body);
}

/** Encode an encrypted message frame using the per-pair shared secret. */
export function encodeEncryptedFrame(message: Message, secretKey: string): Uint8Array {
  const { encrypted, nonce } = encryptMessage(message, secretKey);
  const nonceBytes = decodeBase64(nonce);
  const body = new Uint8Array(1 + 1 + nonceBytes.length + encrypted.length);
  body[0] = FRAME_KIND_ENCRYPTED;
  body[1] = nonceBytes.length;
  body.set(nonceBytes, 2);
  body.set(encrypted, 2 + nonceBytes.length);
  return frame(body);
}

export type DecodedFrame =
  | { kind: 'plaintext'; message: Message }
  | { kind: 'encrypted'; message: Message };

/** Decode one frame body. `secretKey` is required to read encrypted frames. */
export function decodeFrameBody(body: Uint8Array, secretKey?: string): DecodedFrame | null {
  if (body.length < 1) return null;
  const kind = body[0];
  const payload = body.subarray(1);

  if (kind === FRAME_KIND_PLAINTEXT) {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload)) as Message;
      return { kind: 'plaintext', message };
    } catch {
      return null;
    }
  }

  if (kind === FRAME_KIND_ENCRYPTED) {
    if (!secretKey || payload.length < 1) return null;
    const nonceLen = payload[0];
    if (payload.length < 1 + nonceLen) return null;
    const nonce = encodeBase64(payload.subarray(1, 1 + nonceLen));
    const encrypted = payload.subarray(1 + nonceLen);
    const message = decryptMessage(encrypted, nonce, secretKey);
    return message ? { kind: 'encrypted', message } : null;
  }

  return null;
}

/**
 * Accumulates incoming bytes and yields complete frame bodies. The shared
 * secret can be set once pairing succeeds so later encrypted frames decode.
 */
export class FrameBuffer {
  private buffer: Uint8Array = new Uint8Array(0);

  append(data: Uint8Array): void {
    const next = new Uint8Array(this.buffer.length + data.length);
    next.set(this.buffer);
    next.set(data, this.buffer.length);
    this.buffer = next;
  }

  /** Pull the next complete frame body, or null if none is fully buffered. */
  private nextBody(): Uint8Array | null {
    if (this.buffer.length < FRAME_HEADER_LENGTH) return null;
    const len = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset
    ).getUint32(0, false);
    if (len > MAX_FRAME_SIZE) {
      // Corrupt/oversized: drop the buffer to avoid getting stuck.
      this.buffer = new Uint8Array(0);
      return null;
    }
    if (this.buffer.length < FRAME_HEADER_LENGTH + len) return null;
    const body = this.buffer.slice(FRAME_HEADER_LENGTH, FRAME_HEADER_LENGTH + len);
    this.buffer = this.buffer.slice(FRAME_HEADER_LENGTH + len);
    return body;
  }

  /** Decode all complete frames currently buffered. */
  drain(secretKey?: string): DecodedFrame[] {
    const out: DecodedFrame[] = [];
    let body: Uint8Array | null;
    while ((body = this.nextBody()) !== null) {
      const decoded = decodeFrameBody(body, secretKey);
      if (decoded) out.push(decoded);
    }
    return out;
  }
}
