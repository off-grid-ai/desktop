import type {
  DeviceInfo,
  PairedDevice,
  PairingStatus,
  Message,
  PairRequestMessage,
  PairChallengeMessage,
  PairResponseMessage,
  PairConfirmMessage,
  PairRejectMessage,
} from '../types';
import {
  deriveSharedSecret,
  generateChallenge,
  createChallengeResponse,
  verifyChallengeResponse,
  generateMessageId,
} from '../crypto';

/**
 * Pairing state machine for managing the pairing handshake
 */
export interface PairingState {
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
export function createPairingState(localDevice: DeviceInfo): PairingState {
  return {
    status: 'idle',
    localDevice,
  };
}

/**
 * Create a pair request message
 */
export function createPairRequest(localDevice: DeviceInfo): PairRequestMessage {
  return {
    type: 'pair_request',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      deviceInfo: localDevice,
    },
  };
}

/**
 * Create a pair challenge message
 */
export function createPairChallenge(): PairChallengeMessage {
  const challenge = generateChallenge();
  return {
    type: 'pair_challenge',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      challenge,
      timestamp: Date.now(),
    },
  };
}

/**
 * Create a pair response message
 */
export function createPairResponse(
  challenge: string,
  sharedSecret: string,
  localDevice: DeviceInfo
): PairResponseMessage {
  const response = createChallengeResponse(challenge, sharedSecret);
  return {
    type: 'pair_response',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      response,
      deviceInfo: localDevice,
    },
  };
}

/**
 * Create a pair confirm message
 */
export function createPairConfirm(localDevice: DeviceInfo): PairConfirmMessage {
  return {
    type: 'pair_confirm',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      deviceInfo: localDevice,
    },
  };
}

/**
 * Create a pair reject message
 */
export function createPairReject(reason: string): PairRejectMessage {
  return {
    type: 'pair_reject',
    id: generateMessageId(),
    timestamp: Date.now(),
    payload: {
      reason,
    },
  };
}

/**
 * Handle pairing state transitions
 */
export function handlePairingMessage(
  state: PairingState,
  message: Message,
  passphrase?: string
): { newState: PairingState; response?: Message } {
  switch (message.type) {
    case 'pair_request': {
      const msg = message as PairRequestMessage;
      const remoteDevice = msg.payload.deviceInfo;

      if (!passphrase) {
        // Waiting for user to enter passphrase
        return {
          newState: {
            ...state,
            status: 'waiting',
            remoteDevice,
          },
        };
      }

      // Generate shared secret and challenge
      const sharedSecret = deriveSharedSecret(
        passphrase,
        state.localDevice.id,
        remoteDevice.id
      );
      const challengeMsg = createPairChallenge();

      return {
        newState: {
          ...state,
          status: 'verifying',
          remoteDevice,
          passphrase,
          sharedSecret,
          challenge: challengeMsg.payload.challenge,
        },
        response: challengeMsg,
      };
    }

    case 'pair_challenge': {
      const msg = message as PairChallengeMessage;

      if (!passphrase || !state.remoteDevice) {
        return {
          newState: {
            ...state,
            status: 'failed',
            error: 'Missing passphrase or remote device',
          },
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
          status: 'verifying',
          sharedSecret,
        },
        response: responseMsg,
      };
    }

    case 'pair_response': {
      const msg = message as PairResponseMessage;

      if (!state.sharedSecret || !state.challenge) {
        return {
          newState: {
            ...state,
            status: 'failed',
            error: 'Invalid pairing state',
          },
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
            status: 'success',
            remoteDevice: msg.payload.deviceInfo,
          },
          response: confirmMsg,
        };
      } else {
        const rejectMsg = createPairReject('Passphrase mismatch');
        return {
          newState: {
            ...state,
            status: 'failed',
            error: 'Passphrase mismatch',
          },
          response: rejectMsg,
        };
      }
    }

    case 'pair_confirm': {
      return {
        newState: {
          ...state,
          status: 'success',
        },
      };
    }

    case 'pair_reject': {
      const msg = message as PairRejectMessage;
      return {
        newState: {
          ...state,
          status: 'failed',
          error: msg.payload.reason,
        },
      };
    }

    default:
      return { newState: state };
  }
}

/**
 * Create a PairedDevice from successful pairing
 */
export function createPairedDevice(state: PairingState): PairedDevice | null {
  if (state.status !== 'success' || !state.remoteDevice || !state.sharedSecret) {
    return null;
  }

  return {
    ...state.remoteDevice,
    sharedSecret: state.sharedSecret,
    pairedAt: Date.now(),
  };
}

/**
 * Check if a device is already paired
 */
export function isPaired(deviceId: string, pairedDevices: PairedDevice[]): boolean {
  return pairedDevices.some((d) => d.id === deviceId);
}

/**
 * Get a paired device by ID
 */
export function getPairedDevice(
  deviceId: string,
  pairedDevices: PairedDevice[]
): PairedDevice | undefined {
  return pairedDevices.find((d) => d.id === deviceId);
}

/**
 * Update last connected time for a paired device
 */
export function updateLastConnected(
  deviceId: string,
  pairedDevices: PairedDevice[]
): PairedDevice[] {
  return pairedDevices.map((d) =>
    d.id === deviceId ? { ...d, lastConnected: Date.now() } : d
  );
}

/**
 * Remove a paired device
 */
export function removePairedDevice(
  deviceId: string,
  pairedDevices: PairedDevice[]
): PairedDevice[] {
  return pairedDevices.filter((d) => d.id !== deviceId);
}
