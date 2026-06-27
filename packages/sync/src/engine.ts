// SyncEngine: ties pairing and encrypted messaging together over a
// TransportBridge. Host-agnostic - give it a transport and a local device and
// it manages the handshake and routes application messages to paired peers.

import type { DeviceInfo, PairedDevice, Message, MessageType } from './types';
import {
  createPairingState,
  handlePairingMessage,
  createPairRequest,
  createPairedDevice,
  type PairingState,
} from './pairing';
import { FrameBuffer, encodePlaintextFrame, encodeEncryptedFrame } from './wire';
import { createAppMessage, createHello } from './protocol';
import type { SyncConnection, TransportBridge } from './transport';
import { pairingAllowed, type DeviceCap } from './cap';
import { createPairReject } from './pairing';

const PAIRING_TYPES: ReadonlySet<MessageType> = new Set<MessageType>([
  'pair_request',
  'pair_challenge',
  'pair_response',
  'pair_confirm',
  'pair_reject',
]);

export interface SyncEngineOptions {
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
class PeerSession {
  private buffer = new FrameBuffer();
  private pairing: PairingState;
  private sharedSecret?: string;
  private passphrase?: string;
  private resumeSecret?: string;
  private helloSent = false;
  private queue: Promise<void> = Promise.resolve();
  remoteDevice?: DeviceInfo;

  constructor(
    readonly conn: SyncConnection,
    private readonly engine: SyncEngine,
    private readonly opts: SyncEngineOptions,
    initiateWith?: { remote: DeviceInfo; passphrase: string },
    resumeWith?: { remote: DeviceInfo; sharedSecret: string }
  ) {
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
      // Reconnect: greet with a plaintext hello so the peer resumes with the
      // stored secret. The secret only goes "live" once hello round-trips.
      this.sendPlain(createHello(opts.localDevice));
      this.helloSent = true;
    }
  }

  get pairedSecret(): string | undefined {
    return this.sharedSecret;
  }

  /** Send an application message to this peer (must be paired). */
  sendMessage(message: Message): boolean {
    if (!this.sharedSecret) return false;
    this.conn.send(encodeEncryptedFrame(message, this.sharedSecret));
    return true;
  }

  private sendPlain(message: Message): void {
    this.conn.send(encodePlaintextFrame(message));
  }

  private onData(data: Uint8Array): void {
    this.buffer.append(data);
    const frames = this.buffer.drain(this.sharedSecret);
    // Serialize handling so async passphrase prompts keep handshake order.
    for (const f of frames) {
      this.queue = this.queue.then(() => this.route(f.message));
    }
  }

  private async route(message: Message): Promise<void> {
    if (message.type === 'hello') {
      this.handleHello(message);
      return;
    }
    if (PAIRING_TYPES.has(message.type)) {
      await this.handlePairing(message);
      return;
    }
    if (this.sharedSecret && this.remoteDevice) {
      if (message.type === 'app') {
        const p = message.payload as { channel: string; data: unknown };
        this.opts.onAppMessage?.(this.remoteDevice.id, p.channel, p.data);
      } else {
        this.opts.onMessage?.(this.remoteDevice.id, message);
      }
    }
  }

  /** Resume an already-paired device using the stored secret (no handshake). */
  private handleHello(message: Message): void {
    const remote = (message as { payload: { deviceInfo: DeviceInfo } }).payload.deviceInfo;
    this.remoteDevice = remote;
    const secret = this.resumeSecret ?? this.opts.getSharedSecret?.(remote.id);
    if (!secret) {
      this.opts.onPairingFailed?.(remote, 'unknown_device');
      this.conn.close();
      return;
    }
    this.sharedSecret = secret;
    if (!this.helloSent) {
      this.sendPlain(createHello(this.opts.localDevice));
      this.helloSent = true;
    }
    const paired: PairedDevice = { ...remote, sharedSecret: secret, pairedAt: Date.now() };
    this.engine._registerPaired(remote.id, this);
    this.opts.onPaired?.(paired);
  }

  private async handlePairing(message: Message): Promise<void> {
    // First inbound pair_request: enforce the device cap, then ask for the passphrase.
    if (message.type === 'pair_request' && this.passphrase == null) {
      const remote = (message as { payload: { deviceInfo: DeviceInfo } }).payload.deviceInfo;
      this.remoteDevice = remote;
      if (!pairingAllowed(this.opts.cap, remote.id)) {
        this.sendPlain(createPairReject('device limit reached'));
        this.opts.onPairingFailed?.(remote, 'device_cap_reached');
        this.conn.close();
        return;
      }
      const pass = await this.opts.getPassphrase?.(remote);
      if (pass == null) {
        this.opts.onPairingFailed?.(remote, 'pairing refused');
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

    if (newState.status === 'success') {
      const paired = createPairedDevice(newState);
      if (paired) {
        this.engine._registerPaired(paired.id, this);
        this.opts.onPaired?.(paired);
      }
    } else if (newState.status === 'failed') {
      this.opts.onPairingFailed?.(this.remoteDevice, newState.error ?? 'pairing failed');
    }
  }
}

export class SyncEngine {
  private sessions = new Set<PeerSession>();
  private paired = new Map<string, PeerSession>();

  constructor(private readonly opts: SyncEngineOptions) {}

  /** Start accepting inbound connections on `port`. */
  async start(port: number): Promise<void> {
    await this.opts.transport.listen(port, (conn) => {
      this.sessions.add(new PeerSession(conn, this, this.opts));
    });
  }

  /** Dial a discovered device and begin pairing with `passphrase`. Refuses if
   * pairing a new device would exceed the device cap. */
  async pair(device: DeviceInfo, passphrase: string): Promise<void> {
    if (!pairingAllowed(this.opts.cap, device.id)) {
      this.opts.onPairingFailed?.(device, 'device_cap_reached');
      return;
    }
    const conn = await this.opts.transport.connect(device.host, device.port);
    const session = new PeerSession(conn, this, this.opts, { remote: device, passphrase });
    this.sessions.add(session);
  }

  /** Reconnect to an already-paired device using its stored shared secret,
   * skipping the pairing handshake. Used for auto-reconnect on discovery. */
  async reconnect(device: DeviceInfo, sharedSecret: string): Promise<void> {
    const conn = await this.opts.transport.connect(device.host, device.port);
    const session = new PeerSession(conn, this, this.opts, undefined, { remote: device, sharedSecret });
    this.sessions.add(session);
  }

  /** Send an application message to an already-paired device. */
  send(deviceId: string, message: Message): boolean {
    return this.paired.get(deviceId)?.sendMessage(message) ?? false;
  }

  /** Send a generic app-channel message (encrypted) to a paired device. */
  sendApp(deviceId: string, channel: string, data: unknown): boolean {
    return this.send(deviceId, createAppMessage(channel, data));
  }

  isPaired(deviceId: string): boolean {
    return this.paired.has(deviceId);
  }

  async stop(): Promise<void> {
    for (const s of this.sessions) s.conn.close();
    this.sessions.clear();
    this.paired.clear();
    await this.opts.transport.stop();
  }

  /** @internal */
  _registerPaired(deviceId: string, session: PeerSession): void {
    this.paired.set(deviceId, session);
  }

  /** @internal */
  _removeSession(session: PeerSession): void {
    this.sessions.delete(session);
    for (const [id, s] of this.paired) {
      if (s === session) this.paired.delete(id);
    }
  }
}
