// DiscoveryOrchestrator: ties a DiscoveryService to the SyncEngine. Advertises
// this device, browses for peers, and on finding one either auto-reconnects (if
// already paired, using the stored secret) or surfaces it for the UI to pair.

import type { DeviceInfo, DiscoveredDevice } from './types';
import type { DiscoveryService } from './discovery';

/** The slice of SyncEngine the orchestrator drives. */
export interface ReconnectingEngine {
  isPaired(deviceId: string): boolean;
  reconnect(device: DeviceInfo, sharedSecret: string): Promise<void>;
}

export interface DiscoveryOrchestratorOptions {
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

export class DiscoveryOrchestrator {
  private connecting = new Set<string>();

  constructor(private readonly opts: DiscoveryOrchestratorOptions) {}

  async start(): Promise<void> {
    this.opts.discovery.onDeviceFound((d) => this.handleFound(d));
    this.opts.discovery.onDeviceLost((id) => {
      this.connecting.delete(id);
      this.opts.onLost?.(id);
    });
    await this.opts.discovery.start();
    await this.opts.discovery.advertise(this.opts.localDevice);
  }

  async stop(): Promise<void> {
    await this.opts.discovery.stop();
  }

  private handleFound(device: DiscoveredDevice): void {
    if (device.id === this.opts.localDevice.id) return; // ignore self
    if (this.opts.engine.isPaired(device.id)) return; // already connected
    if (this.connecting.has(device.id)) return; // in-flight

    const secret = this.opts.getSharedSecret(device.id);
    if (secret) {
      this.connecting.add(device.id);
      this.opts.engine
        .reconnect(device, secret)
        .catch(() => undefined)
        .finally(() => this.connecting.delete(device.id));
    } else {
      this.opts.onDiscovered?.(device);
    }
  }
}
