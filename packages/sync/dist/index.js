"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APP_NAME: () => APP_NAME,
  CHUNK_SIZE: () => CHUNK_SIZE,
  DiscoveryOrchestrator: () => DiscoveryOrchestrator,
  FRAME_HEADER_LENGTH: () => FRAME_HEADER_LENGTH,
  FRAME_KIND_ENCRYPTED: () => FRAME_KIND_ENCRYPTED,
  FRAME_KIND_PLAINTEXT: () => FRAME_KIND_PLAINTEXT,
  FREE_DEVICE_CAP: () => FREE_DEVICE_CAP,
  FrameBuffer: () => FrameBuffer,
  HEADER_LENGTH: () => HEADER_LENGTH,
  IncrementalChecksum: () => IncrementalChecksum,
  MAX_FRAME_SIZE: () => MAX_FRAME_SIZE,
  MAX_MESSAGE_SIZE: () => MAX_MESSAGE_SIZE,
  MAX_TEXT_LENGTH: () => MAX_TEXT_LENGTH,
  MDNS_DOMAIN: () => MDNS_DOMAIN,
  MDNS_SERVICE_NAME: () => MDNS_SERVICE_NAME,
  MDNS_SERVICE_TYPE: () => MDNS_SERVICE_TYPE,
  MESSAGE_CODE_TYPES: () => MESSAGE_CODE_TYPES,
  MESSAGE_TYPE_CODES: () => MESSAGE_TYPE_CODES,
  MessageBuffer: () => MessageBuffer,
  PROTOCOL_VERSION: () => PROTOCOL_VERSION,
  SyncEngine: () => SyncEngine,
  TXT_DEVICE_ID: () => TXT_DEVICE_ID,
  TXT_DEVICE_NAME: () => TXT_DEVICE_NAME,
  TXT_PLATFORM: () => TXT_PLATFORM,
  TXT_VERSION: () => TXT_VERSION,
  VERSION: () => VERSION,
  calculateChecksum: () => calculateChecksum,
  calculateProgress: () => calculateProgress,
  chunkFile: () => chunkFile,
  createAppMessage: () => createAppMessage,
  createChallengeResponse: () => createChallengeResponse,
  createDiscoveredDevice: () => createDiscoveredDevice,
  createEncryptedFrame: () => createEncryptedFrame,
  createEncryptedTextMessage: () => createEncryptedTextMessage,
  createErrorMessage: () => createErrorMessage,
  createFileAccept: () => createFileAccept,
  createFileAcceptHttp: () => createFileAcceptHttp,
  createFileAck: () => createFileAck,
  createFileChunk: () => createFileChunk,
  createFileChunkFromBase64: () => createFileChunkFromBase64,
  createFileComplete: () => createFileComplete,
  createFileCompleteStreaming: () => createFileCompleteStreaming,
  createFileReject: () => createFileReject,
  createFileRequest: () => createFileRequest,
  createFileRequestHttp: () => createFileRequestHttp,
  createFileRequestStreaming: () => createFileRequestStreaming,
  createFileTransfer: () => createFileTransfer,
  createHello: () => createHello,
  createPairChallenge: () => createPairChallenge,
  createPairConfirm: () => createPairConfirm,
  createPairReject: () => createPairReject,
  createPairRequest: () => createPairRequest,
  createPairResponse: () => createPairResponse,
  createPairedDevice: () => createPairedDevice,
  createPairingState: () => createPairingState,
  createPingMessage: () => createPingMessage,
  createPongMessage: () => createPongMessage,
  createTextMessage: () => createTextMessage,
  createTextTransfer: () => createTextTransfer,
  createTxtRecord: () => createTxtRecord,
  decodeBase64: () => import_tweetnacl_util.decodeBase64,
  decodeFrameBody: () => decodeFrameBody,
  decodeUTF8: () => import_tweetnacl_util.decodeUTF8,
  decrypt: () => decrypt,
  decryptMessage: () => decryptMessage,
  decryptTextMessage: () => decryptTextMessage,
  decryptToString: () => decryptToString,
  deriveKey: () => deriveKey,
  deriveSharedSecret: () => deriveSharedSecret,
  deserializeMessage: () => deserializeMessage,
  encodeBase64: () => import_tweetnacl_util.encodeBase64,
  encodeEncryptedFrame: () => encodeEncryptedFrame,
  encodePlaintextFrame: () => encodePlaintextFrame,
  encodeUTF8: () => import_tweetnacl_util.encodeUTF8,
  encrypt: () => encrypt,
  encryptMessage: () => encryptMessage,
  filterStaleDevices: () => filterStaleDevices,
  formatDuration: () => formatDuration,
  formatEta: () => formatEta,
  formatFileSize: () => formatFileSize,
  formatProgressInfo: () => formatProgressInfo,
  formatTransferSpeed: () => formatTransferSpeed,
  freePolicy: () => freePolicy,
  generateChallenge: () => generateChallenge,
  generateDeviceId: () => generateDeviceId,
  generateMessageId: () => generateMessageId,
  getMessageLength: () => getMessageLength,
  getMimeType: () => getMimeType,
  getPairedDevice: () => getPairedDevice,
  handlePairingMessage: () => handlePairingMessage,
  isDeviceStale: () => isDeviceStale,
  isPaired: () => isPaired,
  pairingAllowed: () => pairingAllowed,
  parseEncryptedFrame: () => parseEncryptedFrame,
  parseTxtRecord: () => parseTxtRecord,
  policyFor: () => policyFor,
  reassembleChunks: () => reassembleChunks,
  removeDevice: () => removeDevice,
  removePairedDevice: () => removePairedDevice,
  serializeMessage: () => serializeMessage,
  updateDeviceList: () => updateDeviceList,
  updateLastConnected: () => updateLastConnected,
  verifyChallengeResponse: () => verifyChallengeResponse,
  verifyChecksum: () => verifyChecksum,
  verifyFileIntegrity: () => verifyFileIntegrity
});
module.exports = __toCommonJS(index_exports);

// src/crypto/index.ts
var import_tweetnacl = __toESM(require("tweetnacl"));
var import_tweetnacl_util = require("tweetnacl-util");
var import_js_sha512 = require("js-sha512");
var PBKDF2_ITERATIONS = 1e4;
var SALT_LENGTH = 16;
var KEY_LENGTH = 32;
function generateDeviceId() {
  const bytes = import_tweetnacl.default.randomBytes(16);
  return (0, import_tweetnacl_util.encodeBase64)(bytes).replace(
    /[+/=]/g,
    (c) => c === "+" ? "-" : c === "/" ? "_" : ""
  );
}
function generateMessageId() {
  const bytes = import_tweetnacl.default.randomBytes(8);
  return (0, import_tweetnacl_util.encodeBase64)(bytes).replace(
    /[+/=]/g,
    (c) => c === "+" ? "-" : c === "/" ? "_" : ""
  );
}
function deriveKey(passphrase, salt, iterations = PBKDF2_ITERATIONS) {
  const passphraseBytes = (0, import_tweetnacl_util.decodeUTF8)(passphrase);
  const combined = new Uint8Array(passphraseBytes.length + salt.length);
  combined.set(passphraseBytes);
  combined.set(salt, passphraseBytes.length);
  let result = import_tweetnacl.default.hash(combined);
  for (let i = 1; i < iterations; i++) {
    result = import_tweetnacl.default.hash(result);
  }
  return result.slice(0, KEY_LENGTH);
}
function deriveSharedSecret(passphrase, deviceId1, deviceId2) {
  const sortedIds = [deviceId1, deviceId2].sort();
  const saltString = `${sortedIds[0]}:${sortedIds[1]}`;
  const salt = import_tweetnacl.default.hash((0, import_tweetnacl_util.decodeUTF8)(saltString)).slice(0, SALT_LENGTH);
  const key = deriveKey(passphrase, salt);
  return (0, import_tweetnacl_util.encodeBase64)(key);
}
function generateChallenge() {
  const bytes = import_tweetnacl.default.randomBytes(32);
  return (0, import_tweetnacl_util.encodeBase64)(bytes);
}
function createChallengeResponse(challenge, sharedSecret) {
  const challengeBytes = (0, import_tweetnacl_util.decodeBase64)(challenge);
  const secretBytes = (0, import_tweetnacl_util.decodeBase64)(sharedSecret);
  const combined = new Uint8Array(challengeBytes.length + secretBytes.length);
  combined.set(challengeBytes);
  combined.set(secretBytes, challengeBytes.length);
  const hash = import_tweetnacl.default.hash(combined);
  return (0, import_tweetnacl_util.encodeBase64)(hash.slice(0, 32));
}
function verifyChallengeResponse(challenge, response, sharedSecret) {
  const expectedResponse = createChallengeResponse(challenge, sharedSecret);
  return response === expectedResponse;
}
function encrypt(data, secretKey) {
  const keyBytes = (0, import_tweetnacl_util.decodeBase64)(secretKey);
  const dataBytes = typeof data === "string" ? (0, import_tweetnacl_util.decodeUTF8)(data) : data;
  const nonce = import_tweetnacl.default.randomBytes(import_tweetnacl.default.secretbox.nonceLength);
  const encrypted = import_tweetnacl.default.secretbox(dataBytes, nonce, keyBytes);
  return {
    encrypted: (0, import_tweetnacl_util.encodeBase64)(encrypted),
    nonce: (0, import_tweetnacl_util.encodeBase64)(nonce)
  };
}
function decrypt(encrypted, nonce, secretKey) {
  const keyBytes = (0, import_tweetnacl_util.decodeBase64)(secretKey);
  const encryptedBytes = (0, import_tweetnacl_util.decodeBase64)(encrypted);
  const nonceBytes = (0, import_tweetnacl_util.decodeBase64)(nonce);
  const decrypted = import_tweetnacl.default.secretbox.open(encryptedBytes, nonceBytes, keyBytes);
  return decrypted;
}
function decryptToString(encrypted, nonce, secretKey) {
  const decrypted = decrypt(encrypted, nonce, secretKey);
  if (!decrypted) return null;
  return (0, import_tweetnacl_util.encodeUTF8)(decrypted);
}
function calculateChecksum(data) {
  const hash = import_tweetnacl.default.hash(data);
  return (0, import_tweetnacl_util.encodeBase64)(hash.slice(0, 16));
}
function verifyChecksum(data, checksum) {
  const calculated = calculateChecksum(data);
  return calculated === checksum;
}
var IncrementalChecksum = class {
  hasher;
  constructor() {
    this.hasher = import_js_sha512.sha512.create();
  }
  /**
   * Feed a chunk of data into the hash
   */
  update(data) {
    this.hasher.update(data);
  }
  /**
   * Finalize and return checksum in the same format as calculateChecksum()
   * (base64 of first 16 bytes of SHA-512 digest)
   */
  digest() {
    const hashArray = this.hasher.array();
    const first16 = new Uint8Array(hashArray.slice(0, 16));
    return (0, import_tweetnacl_util.encodeBase64)(first16);
  }
};

// src/discovery/index.ts
var MDNS_SERVICE_TYPE = "_easyshare._tcp";
var MDNS_SERVICE_NAME = "EasyShare";
var MDNS_DOMAIN = "local";
var TXT_DEVICE_ID = "id";
var TXT_DEVICE_NAME = "name";
var TXT_PLATFORM = "platform";
var TXT_VERSION = "version";
function createTxtRecord(device) {
  return {
    [TXT_DEVICE_ID]: device.id,
    [TXT_DEVICE_NAME]: device.name,
    [TXT_PLATFORM]: device.platform,
    [TXT_VERSION]: device.version
  };
}
function parseTxtRecord(txt, host, port) {
  const id = txt[TXT_DEVICE_ID];
  const name = txt[TXT_DEVICE_NAME];
  const platform = txt[TXT_PLATFORM];
  const version = txt[TXT_VERSION];
  if (!id || !name || !platform || !version) {
    return null;
  }
  return {
    id,
    name,
    platform,
    version,
    host,
    port
  };
}
function createDiscoveredDevice(device) {
  return {
    ...device,
    lastSeen: Date.now()
  };
}
function isDeviceStale(device, maxAgeMs = 3e4) {
  return Date.now() - device.lastSeen > maxAgeMs;
}
function filterStaleDevices(devices, maxAgeMs = 3e4) {
  return devices.filter((device) => !isDeviceStale(device, maxAgeMs));
}
function updateDeviceList(devices, newDevice) {
  const existingIndex = devices.findIndex((d) => d.id === newDevice.id);
  if (existingIndex >= 0) {
    const updated = [...devices];
    updated[existingIndex] = { ...newDevice, lastSeen: Date.now() };
    return updated;
  }
  return [...devices, newDevice];
}
function removeDevice(devices, deviceId) {
  return devices.filter((d) => d.id !== deviceId);
}

// src/pairing/index.ts
function createPairingState(localDevice) {
  return {
    status: "idle",
    localDevice
  };
}
function createPairRequest(localDevice) {
  return {
    type: "pair_request",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      deviceInfo: localDevice
    }
  };
}
function createPairChallenge() {
  const challenge = generateChallenge();
  return {
    type: "pair_challenge",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      challenge,
      timestamp: Date.now()
    }
  };
}
function createPairResponse(challenge, sharedSecret, localDevice) {
  const response = createChallengeResponse(challenge, sharedSecret);
  return {
    type: "pair_response",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      response,
      deviceInfo: localDevice
    }
  };
}
function createPairConfirm(localDevice) {
  return {
    type: "pair_confirm",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      deviceInfo: localDevice
    }
  };
}
function createPairReject(reason) {
  return {
    type: "pair_reject",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      reason
    }
  };
}
function handlePairingMessage(state, message, passphrase) {
  switch (message.type) {
    case "pair_request": {
      const msg = message;
      const remoteDevice = msg.payload.deviceInfo;
      if (!passphrase) {
        return {
          newState: {
            ...state,
            status: "waiting",
            remoteDevice
          }
        };
      }
      const sharedSecret = deriveSharedSecret(
        passphrase,
        state.localDevice.id,
        remoteDevice.id
      );
      const challengeMsg = createPairChallenge();
      return {
        newState: {
          ...state,
          status: "verifying",
          remoteDevice,
          passphrase,
          sharedSecret,
          challenge: challengeMsg.payload.challenge
        },
        response: challengeMsg
      };
    }
    case "pair_challenge": {
      const msg = message;
      if (!passphrase || !state.remoteDevice) {
        return {
          newState: {
            ...state,
            status: "failed",
            error: "Missing passphrase or remote device"
          }
        };
      }
      const sharedSecret = deriveSharedSecret(
        passphrase,
        state.localDevice.id,
        state.remoteDevice.id
      );
      const responseMsg = createPairResponse(
        msg.payload.challenge,
        sharedSecret,
        state.localDevice
      );
      return {
        newState: {
          ...state,
          status: "verifying",
          sharedSecret
        },
        response: responseMsg
      };
    }
    case "pair_response": {
      const msg = message;
      if (!state.sharedSecret || !state.challenge) {
        return {
          newState: {
            ...state,
            status: "failed",
            error: "Invalid pairing state"
          }
        };
      }
      const isValid = verifyChallengeResponse(
        state.challenge,
        msg.payload.response,
        state.sharedSecret
      );
      if (isValid) {
        const confirmMsg = createPairConfirm(state.localDevice);
        return {
          newState: {
            ...state,
            status: "success",
            remoteDevice: msg.payload.deviceInfo
          },
          response: confirmMsg
        };
      } else {
        const rejectMsg = createPairReject("Passphrase mismatch");
        return {
          newState: {
            ...state,
            status: "failed",
            error: "Passphrase mismatch"
          },
          response: rejectMsg
        };
      }
    }
    case "pair_confirm": {
      return {
        newState: {
          ...state,
          status: "success"
        }
      };
    }
    case "pair_reject": {
      const msg = message;
      return {
        newState: {
          ...state,
          status: "failed",
          error: msg.payload.reason
        }
      };
    }
    default:
      return { newState: state };
  }
}
function createPairedDevice(state) {
  if (state.status !== "success" || !state.remoteDevice || !state.sharedSecret) {
    return null;
  }
  return {
    ...state.remoteDevice,
    sharedSecret: state.sharedSecret,
    pairedAt: Date.now()
  };
}
function isPaired(deviceId, pairedDevices) {
  return pairedDevices.some((d) => d.id === deviceId);
}
function getPairedDevice(deviceId, pairedDevices) {
  return pairedDevices.find((d) => d.id === deviceId);
}
function updateLastConnected(deviceId, pairedDevices) {
  return pairedDevices.map(
    (d) => d.id === deviceId ? { ...d, lastConnected: Date.now() } : d
  );
}
function removePairedDevice(deviceId, pairedDevices) {
  return pairedDevices.filter((d) => d.id !== deviceId);
}

// src/transfer/index.ts
var CHUNK_SIZE = 64 * 1024;
var MAX_TEXT_LENGTH = 1024 * 1024;
function createTextTransfer(content, device, direction) {
  return {
    id: generateMessageId(),
    type: "text",
    timestamp: Date.now(),
    direction,
    deviceId: device.id,
    deviceName: device.name,
    content
  };
}
function createFileTransfer(fileName, fileSize, mimeType, device, direction, durationMs) {
  const transfer = {
    id: generateMessageId(),
    type: "file",
    timestamp: Date.now(),
    direction,
    deviceId: device.id,
    deviceName: device.name,
    fileName,
    fileSize,
    mimeType
  };
  if (durationMs != null && durationMs > 0) {
    transfer.durationMs = durationMs;
    transfer.speedBytesPerSec = Math.round(fileSize / durationMs * 1e3);
  }
  return transfer;
}
function createTextMessage(content) {
  return {
    type: "text",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      content
    }
  };
}
function createEncryptedTextMessage(content, secretKey) {
  const { encrypted, nonce } = encrypt(content, secretKey);
  return {
    message: createTextMessage(encrypted),
    nonce
  };
}
function decryptTextMessage(message, nonce, secretKey) {
  const decrypted = decrypt(message.payload.content, nonce, secretKey);
  if (!decrypted) return null;
  return new TextDecoder().decode(decrypted);
}
function createFileRequest(fileName, fileSize, mimeType, fileData) {
  return {
    type: "file_request",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      fileName,
      fileSize,
      mimeType,
      checksum: calculateChecksum(fileData)
    }
  };
}
function createFileRequestStreaming(fileName, fileSize, mimeType, checksum) {
  return {
    type: "file_request",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      fileName,
      fileSize,
      mimeType,
      checksum
    }
  };
}
function createFileCompleteStreaming(requestId, checksum) {
  return {
    type: "file_complete",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      checksum
    }
  };
}
function createFileRequestHttp(fileName, fileSize, mimeType, checksum, httpUrl) {
  return {
    type: "file_request",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      fileName,
      fileSize,
      mimeType,
      checksum,
      httpUrl
    }
  };
}
function createFileAccept(requestId) {
  return {
    type: "file_accept",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId
    }
  };
}
function createFileAcceptHttp(requestId, uploadUrl) {
  return {
    type: "file_accept",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      uploadUrl
    }
  };
}
function createFileAck(requestId, success) {
  return {
    type: "file_ack",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      success
    }
  };
}
function createFileReject(requestId, reason) {
  return {
    type: "file_reject",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      reason
    }
  };
}
function createFileChunk(requestId, chunkIndex, totalChunks, data) {
  return {
    type: "file_chunk",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      chunkIndex,
      totalChunks,
      data: (0, import_tweetnacl_util.encodeBase64)(data)
    }
  };
}
function createFileChunkFromBase64(requestId, chunkIndex, totalChunks, base64Data) {
  return {
    type: "file_chunk",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      chunkIndex,
      totalChunks,
      data: base64Data
    }
  };
}
function createFileComplete(requestId, fileData) {
  return {
    type: "file_complete",
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      requestId,
      checksum: calculateChecksum(fileData)
    }
  };
}
function* chunkFile(data, chunkSize = CHUNK_SIZE) {
  const totalChunks = Math.ceil(data.length / chunkSize);
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    yield {
      chunk: data.slice(start, end),
      index: i,
      total: totalChunks
    };
  }
}
function reassembleChunks(chunks, totalChunks) {
  if (chunks.size !== totalChunks) {
    return null;
  }
  let totalSize = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks.get(i);
    if (!chunk) return null;
    totalSize += chunk.length;
  }
  const result = new Uint8Array(totalSize);
  let offset = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks.get(i);
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function calculateProgress(transferId, bytesTransferred, totalBytes, currentFile, startTime) {
  const clampedBytes = Math.min(bytesTransferred, totalBytes);
  const result = {
    transferId,
    bytesTransferred: clampedBytes,
    totalBytes,
    percentage: totalBytes > 0 ? Math.min(100, Math.round(clampedBytes / totalBytes * 100)) : 0,
    currentFile
  };
  if (startTime && startTime > 0) {
    const elapsedMs = Date.now() - startTime;
    result.elapsedMs = elapsedMs;
    if (elapsedMs > 500 && clampedBytes > 0) {
      result.speedBytesPerSec = Math.round(clampedBytes / elapsedMs * 1e3);
      if (result.speedBytesPerSec > 0 && clampedBytes < totalBytes) {
        const remainingBytes = totalBytes - clampedBytes;
        result.etaSeconds = Math.round(remainingBytes / result.speedBytesPerSec);
      }
    }
  }
  return result;
}
function verifyFileIntegrity(data, expectedChecksum) {
  return verifyChecksum(data, expectedChecksum);
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
function formatTransferSpeed(bytesPerSec) {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
}
function formatDuration(ms) {
  if (ms < 1e3) return `${ms}ms`;
  const seconds = ms / 1e3;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}
function formatEta(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
function formatProgressInfo(progress) {
  const parts = [];
  if (progress.speedBytesPerSec != null && progress.speedBytesPerSec > 0) {
    parts.push(formatTransferSpeed(progress.speedBytesPerSec));
  }
  if (progress.elapsedMs != null && progress.elapsedMs >= 1e3) {
    parts.push(formatDuration(progress.elapsedMs) + " elapsed");
  }
  if (progress.etaSeconds != null && progress.etaSeconds > 0) {
    parts.push("~" + formatEta(progress.etaSeconds) + " left");
  }
  return parts.join(" \xB7 ");
}
function getMimeType(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeTypes = {
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    pdf: "application/pdf",
    zip: "application/zip",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    webm: "video/webm",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// src/protocol/index.ts
var PROTOCOL_VERSION = "1.0.0";
var HEADER_LENGTH = 5;
var MAX_MESSAGE_SIZE = 10 * 1024 * 1024;
var MESSAGE_TYPE_CODES = {
  ping: 1,
  pong: 2,
  pair_request: 16,
  pair_challenge: 17,
  pair_response: 18,
  pair_confirm: 19,
  pair_reject: 20,
  hello: 21,
  text: 32,
  file_request: 48,
  file_accept: 49,
  file_reject: 50,
  file_chunk: 51,
  file_complete: 52,
  file_ack: 53,
  app: 64,
  error: 255
};
function createHello(deviceInfo) {
  return {
    type: "hello",
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
    payload: { deviceInfo }
  };
}
function createAppMessage(channel, data) {
  return {
    type: "app",
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
    payload: { channel, data }
  };
}
var MESSAGE_CODE_TYPES = Object.fromEntries(
  Object.entries(MESSAGE_TYPE_CODES).map(([k, v]) => [v, k])
);
function serializeMessage(message) {
  const jsonPayload = JSON.stringify(message);
  const payloadBytes = new TextEncoder().encode(jsonPayload);
  const typeCode = MESSAGE_TYPE_CODES[message.type] || 255;
  const buffer = new Uint8Array(HEADER_LENGTH + payloadBytes.length);
  const view = new DataView(buffer.buffer);
  view.setUint32(0, payloadBytes.length, false);
  buffer[4] = typeCode;
  buffer.set(payloadBytes, HEADER_LENGTH);
  return buffer;
}
function deserializeMessage(buffer) {
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
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
function getMessageLength(header) {
  if (header.length < 4) {
    return null;
  }
  const view = new DataView(header.buffer, header.byteOffset);
  const length = view.getUint32(0, false);
  if (length > MAX_MESSAGE_SIZE) {
    return null;
  }
  return HEADER_LENGTH + length;
}
function encryptMessage(message, secretKey) {
  const serialized = serializeMessage(message);
  const { encrypted, nonce } = encrypt(serialized, secretKey);
  return {
    encrypted: (0, import_tweetnacl_util.decodeBase64)(encrypted),
    nonce
  };
}
function decryptMessage(encrypted, nonce, secretKey) {
  const decrypted = decrypt((0, import_tweetnacl_util.encodeBase64)(encrypted), nonce, secretKey);
  if (!decrypted) return null;
  return deserializeMessage(decrypted);
}
function createEncryptedFrame(encrypted, nonce) {
  const nonceBytes = (0, import_tweetnacl_util.decodeBase64)(nonce);
  const frame2 = new Uint8Array(1 + nonceBytes.length + encrypted.length);
  frame2[0] = nonceBytes.length;
  frame2.set(nonceBytes, 1);
  frame2.set(encrypted, 1 + nonceBytes.length);
  return frame2;
}
function parseEncryptedFrame(frame2) {
  if (frame2.length < 2) return null;
  const nonceLength = frame2[0];
  if (frame2.length < 1 + nonceLength) return null;
  const nonceBytes = frame2.slice(1, 1 + nonceLength);
  const encrypted = frame2.slice(1 + nonceLength);
  return {
    encrypted,
    nonce: (0, import_tweetnacl_util.encodeBase64)(nonceBytes)
  };
}
var MessageBuffer = class {
  buffer = new Uint8Array(0);
  /**
   * Add data to the buffer
   */
  append(data) {
    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
  }
  /**
   * Try to extract a complete message from the buffer
   */
  extractMessage() {
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
  extractAllMessages() {
    const messages = [];
    let message;
    while ((message = this.extractMessage()) !== null) {
      messages.push(message);
    }
    return messages;
  }
  /**
   * Get current buffer size
   */
  get size() {
    return this.buffer.length;
  }
  /**
   * Clear the buffer
   */
  clear() {
    this.buffer = new Uint8Array(0);
  }
};
function createPingMessage() {
  return {
    type: "ping",
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now()
  };
}
function createPongMessage(pingId) {
  return {
    type: "pong",
    id: pingId,
    timestamp: Date.now()
  };
}
function createErrorMessage(code, errorMessage, originalMessageId) {
  return {
    type: "error",
    id: Math.random().toString(36).substring(2, 10),
    timestamp: Date.now(),
    payload: {
      code,
      message: errorMessage,
      originalMessageId
    }
  };
}

// src/wire.ts
var FRAME_HEADER_LENGTH = 4;
var MAX_FRAME_SIZE = 16 * 1024 * 1024;
var FRAME_KIND_PLAINTEXT = 0;
var FRAME_KIND_ENCRYPTED = 1;
function frame(body) {
  const out = new Uint8Array(FRAME_HEADER_LENGTH + body.length);
  new DataView(out.buffer).setUint32(0, body.length, false);
  out.set(body, FRAME_HEADER_LENGTH);
  return out;
}
function encodePlaintextFrame(message) {
  const json = new TextEncoder().encode(JSON.stringify(message));
  const body = new Uint8Array(1 + json.length);
  body[0] = FRAME_KIND_PLAINTEXT;
  body.set(json, 1);
  return frame(body);
}
function encodeEncryptedFrame(message, secretKey) {
  const { encrypted, nonce } = encryptMessage(message, secretKey);
  const nonceBytes = (0, import_tweetnacl_util.decodeBase64)(nonce);
  const body = new Uint8Array(1 + 1 + nonceBytes.length + encrypted.length);
  body[0] = FRAME_KIND_ENCRYPTED;
  body[1] = nonceBytes.length;
  body.set(nonceBytes, 2);
  body.set(encrypted, 2 + nonceBytes.length);
  return frame(body);
}
function decodeFrameBody(body, secretKey) {
  if (body.length < 1) return null;
  const kind = body[0];
  const payload = body.subarray(1);
  if (kind === FRAME_KIND_PLAINTEXT) {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload));
      return { kind: "plaintext", message };
    } catch {
      return null;
    }
  }
  if (kind === FRAME_KIND_ENCRYPTED) {
    if (!secretKey || payload.length < 1) return null;
    const nonceLen = payload[0];
    if (payload.length < 1 + nonceLen) return null;
    const nonce = (0, import_tweetnacl_util.encodeBase64)(payload.subarray(1, 1 + nonceLen));
    const encrypted = payload.subarray(1 + nonceLen);
    const message = decryptMessage(encrypted, nonce, secretKey);
    return message ? { kind: "encrypted", message } : null;
  }
  return null;
}
var FrameBuffer = class {
  buffer = new Uint8Array(0);
  append(data) {
    const next = new Uint8Array(this.buffer.length + data.length);
    next.set(this.buffer);
    next.set(data, this.buffer.length);
    this.buffer = next;
  }
  /** Pull the next complete frame body, or null if none is fully buffered. */
  nextBody() {
    if (this.buffer.length < FRAME_HEADER_LENGTH) return null;
    const len = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset
    ).getUint32(0, false);
    if (len > MAX_FRAME_SIZE) {
      this.buffer = new Uint8Array(0);
      return null;
    }
    if (this.buffer.length < FRAME_HEADER_LENGTH + len) return null;
    const body = this.buffer.slice(FRAME_HEADER_LENGTH, FRAME_HEADER_LENGTH + len);
    this.buffer = this.buffer.slice(FRAME_HEADER_LENGTH + len);
    return body;
  }
  /** Decode all complete frames currently buffered. */
  drain(secretKey) {
    const out = [];
    let body;
    while ((body = this.nextBody()) !== null) {
      const decoded = decodeFrameBody(body, secretKey);
      if (decoded) out.push(decoded);
    }
    return out;
  }
};

// src/cap.ts
var FREE_DEVICE_CAP = 2;
var freePolicy = { limit: () => FREE_DEVICE_CAP };
function policyFor(isPro, proLimit = Infinity) {
  return { limit: () => isPro ? proLimit : FREE_DEVICE_CAP };
}
function pairingAllowed(cap, deviceId) {
  if (!cap) return true;
  if (cap.isKnown(deviceId)) return true;
  return cap.pairedCount() < cap.policy.limit();
}

// src/engine.ts
var PAIRING_TYPES = /* @__PURE__ */ new Set([
  "pair_request",
  "pair_challenge",
  "pair_response",
  "pair_confirm",
  "pair_reject"
]);
var PeerSession = class {
  constructor(conn, engine, opts, initiateWith, resumeWith) {
    this.conn = conn;
    this.engine = engine;
    this.opts = opts;
    this.pairing = createPairingState(opts.localDevice);
    if (initiateWith) {
      this.passphrase = initiateWith.passphrase;
      this.remoteDevice = initiateWith.remote;
      this.pairing = { ...this.pairing, remoteDevice: initiateWith.remote, passphrase: initiateWith.passphrase };
    } else if (resumeWith) {
      this.remoteDevice = resumeWith.remote;
      this.resumeSecret = resumeWith.sharedSecret;
    }
    conn.onData((data) => this.onData(data));
    conn.onClose(() => this.engine._removeSession(this));
    if (initiateWith) {
      this.sendPlain(createPairRequest(opts.localDevice));
    } else if (resumeWith) {
      this.sendPlain(createHello(opts.localDevice));
      this.helloSent = true;
    }
  }
  conn;
  engine;
  opts;
  buffer = new FrameBuffer();
  pairing;
  sharedSecret;
  passphrase;
  resumeSecret;
  helloSent = false;
  queue = Promise.resolve();
  remoteDevice;
  get pairedSecret() {
    return this.sharedSecret;
  }
  /** Send an application message to this peer (must be paired). */
  sendMessage(message) {
    if (!this.sharedSecret) return false;
    this.conn.send(encodeEncryptedFrame(message, this.sharedSecret));
    return true;
  }
  sendPlain(message) {
    this.conn.send(encodePlaintextFrame(message));
  }
  onData(data) {
    this.buffer.append(data);
    const frames = this.buffer.drain(this.sharedSecret);
    for (const f of frames) {
      this.queue = this.queue.then(() => this.route(f.message));
    }
  }
  async route(message) {
    if (message.type === "hello") {
      this.handleHello(message);
      return;
    }
    if (PAIRING_TYPES.has(message.type)) {
      await this.handlePairing(message);
      return;
    }
    if (this.sharedSecret && this.remoteDevice) {
      if (message.type === "app") {
        const p = message.payload;
        this.opts.onAppMessage?.(this.remoteDevice.id, p.channel, p.data);
      } else {
        this.opts.onMessage?.(this.remoteDevice.id, message);
      }
    }
  }
  /** Resume an already-paired device using the stored secret (no handshake). */
  handleHello(message) {
    const remote = message.payload.deviceInfo;
    this.remoteDevice = remote;
    const secret = this.resumeSecret ?? this.opts.getSharedSecret?.(remote.id);
    if (!secret) {
      this.opts.onPairingFailed?.(remote, "unknown_device");
      this.conn.close();
      return;
    }
    this.sharedSecret = secret;
    if (!this.helloSent) {
      this.sendPlain(createHello(this.opts.localDevice));
      this.helloSent = true;
    }
    const paired = { ...remote, sharedSecret: secret, pairedAt: Date.now() };
    this.engine._registerPaired(remote.id, this);
    this.opts.onPaired?.(paired);
  }
  async handlePairing(message) {
    if (message.type === "pair_request" && this.passphrase == null) {
      const remote = message.payload.deviceInfo;
      this.remoteDevice = remote;
      if (!pairingAllowed(this.opts.cap, remote.id)) {
        this.sendPlain(createPairReject("device limit reached"));
        this.opts.onPairingFailed?.(remote, "device_cap_reached");
        this.conn.close();
        return;
      }
      const pass = await this.opts.getPassphrase?.(remote);
      if (pass == null) {
        this.opts.onPairingFailed?.(remote, "pairing refused");
        this.conn.close();
        return;
      }
      this.passphrase = pass;
    }
    const { newState, response } = handlePairingMessage(this.pairing, message, this.passphrase);
    this.pairing = newState;
    if (newState.sharedSecret) this.sharedSecret = newState.sharedSecret;
    if (newState.remoteDevice) this.remoteDevice = newState.remoteDevice;
    if (response) this.sendPlain(response);
    if (newState.status === "success") {
      const paired = createPairedDevice(newState);
      if (paired) {
        this.engine._registerPaired(paired.id, this);
        this.opts.onPaired?.(paired);
      }
    } else if (newState.status === "failed") {
      this.opts.onPairingFailed?.(this.remoteDevice, newState.error ?? "pairing failed");
    }
  }
};
var SyncEngine = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  sessions = /* @__PURE__ */ new Set();
  paired = /* @__PURE__ */ new Map();
  /** Start accepting inbound connections on `port`. */
  async start(port) {
    await this.opts.transport.listen(port, (conn) => {
      this.sessions.add(new PeerSession(conn, this, this.opts));
    });
  }
  /** Dial a discovered device and begin pairing with `passphrase`. Refuses if
   * pairing a new device would exceed the device cap. */
  async pair(device, passphrase) {
    if (!pairingAllowed(this.opts.cap, device.id)) {
      this.opts.onPairingFailed?.(device, "device_cap_reached");
      return;
    }
    const conn = await this.opts.transport.connect(device.host, device.port);
    const session = new PeerSession(conn, this, this.opts, { remote: device, passphrase });
    this.sessions.add(session);
  }
  /** Reconnect to an already-paired device using its stored shared secret,
   * skipping the pairing handshake. Used for auto-reconnect on discovery. */
  async reconnect(device, sharedSecret) {
    const conn = await this.opts.transport.connect(device.host, device.port);
    const session = new PeerSession(conn, this, this.opts, void 0, { remote: device, sharedSecret });
    this.sessions.add(session);
  }
  /** Send an application message to an already-paired device. */
  send(deviceId, message) {
    return this.paired.get(deviceId)?.sendMessage(message) ?? false;
  }
  /** Send a generic app-channel message (encrypted) to a paired device. */
  sendApp(deviceId, channel, data) {
    return this.send(deviceId, createAppMessage(channel, data));
  }
  isPaired(deviceId) {
    return this.paired.has(deviceId);
  }
  async stop() {
    for (const s of this.sessions) s.conn.close();
    this.sessions.clear();
    this.paired.clear();
    await this.opts.transport.stop();
  }
  /** @internal */
  _registerPaired(deviceId, session) {
    this.paired.set(deviceId, session);
  }
  /** @internal */
  _removeSession(session) {
    this.sessions.delete(session);
    for (const [id, s] of this.paired) {
      if (s === session) this.paired.delete(id);
    }
  }
};

// src/orchestrator.ts
var DiscoveryOrchestrator = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  connecting = /* @__PURE__ */ new Set();
  async start() {
    this.opts.discovery.onDeviceFound((d) => this.handleFound(d));
    this.opts.discovery.onDeviceLost((id) => {
      this.connecting.delete(id);
      this.opts.onLost?.(id);
    });
    await this.opts.discovery.start();
    await this.opts.discovery.advertise(this.opts.localDevice);
  }
  async stop() {
    await this.opts.discovery.stop();
  }
  handleFound(device) {
    if (device.id === this.opts.localDevice.id) return;
    if (this.opts.engine.isPaired(device.id)) return;
    if (this.connecting.has(device.id)) return;
    const secret = this.opts.getSharedSecret(device.id);
    if (secret) {
      this.connecting.add(device.id);
      this.opts.engine.reconnect(device, secret).catch(() => void 0).finally(() => this.connecting.delete(device.id));
    } else {
      this.opts.onDiscovered?.(device);
    }
  }
};

// src/index.ts
var VERSION = "0.0.1";
var APP_NAME = "Off Grid Sync";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APP_NAME,
  CHUNK_SIZE,
  DiscoveryOrchestrator,
  FRAME_HEADER_LENGTH,
  FRAME_KIND_ENCRYPTED,
  FRAME_KIND_PLAINTEXT,
  FREE_DEVICE_CAP,
  FrameBuffer,
  HEADER_LENGTH,
  IncrementalChecksum,
  MAX_FRAME_SIZE,
  MAX_MESSAGE_SIZE,
  MAX_TEXT_LENGTH,
  MDNS_DOMAIN,
  MDNS_SERVICE_NAME,
  MDNS_SERVICE_TYPE,
  MESSAGE_CODE_TYPES,
  MESSAGE_TYPE_CODES,
  MessageBuffer,
  PROTOCOL_VERSION,
  SyncEngine,
  TXT_DEVICE_ID,
  TXT_DEVICE_NAME,
  TXT_PLATFORM,
  TXT_VERSION,
  VERSION,
  calculateChecksum,
  calculateProgress,
  chunkFile,
  createAppMessage,
  createChallengeResponse,
  createDiscoveredDevice,
  createEncryptedFrame,
  createEncryptedTextMessage,
  createErrorMessage,
  createFileAccept,
  createFileAcceptHttp,
  createFileAck,
  createFileChunk,
  createFileChunkFromBase64,
  createFileComplete,
  createFileCompleteStreaming,
  createFileReject,
  createFileRequest,
  createFileRequestHttp,
  createFileRequestStreaming,
  createFileTransfer,
  createHello,
  createPairChallenge,
  createPairConfirm,
  createPairReject,
  createPairRequest,
  createPairResponse,
  createPairedDevice,
  createPairingState,
  createPingMessage,
  createPongMessage,
  createTextMessage,
  createTextTransfer,
  createTxtRecord,
  decodeBase64,
  decodeFrameBody,
  decodeUTF8,
  decrypt,
  decryptMessage,
  decryptTextMessage,
  decryptToString,
  deriveKey,
  deriveSharedSecret,
  deserializeMessage,
  encodeBase64,
  encodeEncryptedFrame,
  encodePlaintextFrame,
  encodeUTF8,
  encrypt,
  encryptMessage,
  filterStaleDevices,
  formatDuration,
  formatEta,
  formatFileSize,
  formatProgressInfo,
  formatTransferSpeed,
  freePolicy,
  generateChallenge,
  generateDeviceId,
  generateMessageId,
  getMessageLength,
  getMimeType,
  getPairedDevice,
  handlePairingMessage,
  isDeviceStale,
  isPaired,
  pairingAllowed,
  parseEncryptedFrame,
  parseTxtRecord,
  policyFor,
  reassembleChunks,
  removeDevice,
  removePairedDevice,
  serializeMessage,
  updateDeviceList,
  updateLastConnected,
  verifyChallengeResponse,
  verifyChecksum,
  verifyFileIntegrity
});
