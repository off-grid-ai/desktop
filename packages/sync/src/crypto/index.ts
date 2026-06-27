import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { sha512 } from 'js-sha512';

// Constants
// Note: 10,000 iterations is still secure for a passphrase-based key while being fast enough for mobile
// 100,000 was causing 5-10 second delays on mobile devices
const PBKDF2_ITERATIONS = 10000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits for NaCl secretbox

/**
 * Generate a random device ID
 */
export function generateDeviceId(): string {
  const bytes = nacl.randomBytes(16);
  return encodeBase64(bytes).replace(/[+/=]/g, (c) =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

/**
 * Generate a random message ID
 */
export function generateMessageId(): string {
  const bytes = nacl.randomBytes(8);
  return encodeBase64(bytes).replace(/[+/=]/g, (c) =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

/**
 * Simple PBKDF2-like key derivation using iterated hashing
 * Note: This is a simplified implementation using NaCl primitives
 */
export function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Uint8Array {
  const passphraseBytes = decodeUTF8(passphrase);

  // Combine passphrase and salt
  const combined = new Uint8Array(passphraseBytes.length + salt.length);
  combined.set(passphraseBytes);
  combined.set(salt, passphraseBytes.length);

  // Iteratively hash
  let result = nacl.hash(combined);
  for (let i = 1; i < iterations; i++) {
    result = nacl.hash(result);
  }

  // Take first KEY_LENGTH bytes
  return result.slice(0, KEY_LENGTH);
}

/**
 * Derive a shared secret from a passphrase and two device IDs
 * This ensures both devices derive the same key
 */
export function deriveSharedSecret(
  passphrase: string,
  deviceId1: string,
  deviceId2: string
): string {
  // Sort device IDs to ensure consistent ordering
  const sortedIds = [deviceId1, deviceId2].sort();
  const saltString = `${sortedIds[0]}:${sortedIds[1]}`;
  const salt = nacl.hash(decodeUTF8(saltString)).slice(0, SALT_LENGTH);

  const key = deriveKey(passphrase, salt);
  return encodeBase64(key);
}

/**
 * Generate a random challenge for pairing verification
 */
export function generateChallenge(): string {
  const bytes = nacl.randomBytes(32);
  return encodeBase64(bytes);
}

/**
 * Create an HMAC-like response to a challenge using the shared secret
 */
export function createChallengeResponse(
  challenge: string,
  sharedSecret: string
): string {
  const challengeBytes = decodeBase64(challenge);
  const secretBytes = decodeBase64(sharedSecret);

  // Combine challenge and secret, then hash
  const combined = new Uint8Array(challengeBytes.length + secretBytes.length);
  combined.set(challengeBytes);
  combined.set(secretBytes, challengeBytes.length);

  const hash = nacl.hash(combined);
  return encodeBase64(hash.slice(0, 32));
}

/**
 * Verify a challenge response
 */
export function verifyChallengeResponse(
  challenge: string,
  response: string,
  sharedSecret: string
): boolean {
  const expectedResponse = createChallengeResponse(challenge, sharedSecret);
  return response === expectedResponse;
}

/**
 * Encrypt data using NaCl secretbox (XSalsa20-Poly1305)
 */
export function encrypt(
  data: string | Uint8Array,
  secretKey: string
): { encrypted: string; nonce: string } {
  const keyBytes = decodeBase64(secretKey);
  const dataBytes = typeof data === 'string' ? decodeUTF8(data) : data;
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const encrypted = nacl.secretbox(dataBytes, nonce, keyBytes);

  return {
    encrypted: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt data using NaCl secretbox
 */
export function decrypt(
  encrypted: string,
  nonce: string,
  secretKey: string
): Uint8Array | null {
  const keyBytes = decodeBase64(secretKey);
  const encryptedBytes = decodeBase64(encrypted);
  const nonceBytes = decodeBase64(nonce);

  const decrypted = nacl.secretbox.open(encryptedBytes, nonceBytes, keyBytes);
  return decrypted;
}

/**
 * Decrypt data and return as string
 */
export function decryptToString(
  encrypted: string,
  nonce: string,
  secretKey: string
): string | null {
  const decrypted = decrypt(encrypted, nonce, secretKey);
  if (!decrypted) return null;
  return encodeUTF8(decrypted);
}

/**
 * Calculate a checksum for file integrity verification
 */
export function calculateChecksum(data: Uint8Array): string {
  const hash = nacl.hash(data);
  return encodeBase64(hash.slice(0, 16));
}

/**
 * Verify a checksum
 */
export function verifyChecksum(data: Uint8Array, checksum: string): boolean {
  const calculated = calculateChecksum(data);
  return calculated === checksum;
}

/**
 * Incremental/streaming checksum calculator using SHA-512.
 * Produces the same output format as calculateChecksum() (base64 of first 16 bytes of SHA-512)
 * but allows feeding data in chunks to avoid loading entire files into memory.
 */
export class IncrementalChecksum {
  private hasher: ReturnType<typeof sha512.create>;

  constructor() {
    this.hasher = sha512.create();
  }

  /**
   * Feed a chunk of data into the hash
   */
  update(data: Uint8Array): void {
    this.hasher.update(data);
  }

  /**
   * Finalize and return checksum in the same format as calculateChecksum()
   * (base64 of first 16 bytes of SHA-512 digest)
   */
  digest(): string {
    const hashArray = this.hasher.array();
    const first16 = new Uint8Array(hashArray.slice(0, 16));
    return encodeBase64(first16);
  }
}

// Re-export utilities
export { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 };
