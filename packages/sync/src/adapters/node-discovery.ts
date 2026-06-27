// Node mDNS discovery for @offgrid/sync (desktop). Implements DiscoveryService
// over bonjour-service (pure-JS multicast DNS, no native build) so devices find
// each other on the LAN without manual host/port. React Native uses a native
// NSD/Bonjour module instead; this Node adapter is at @offgrid/sync/node-discovery.

import { Bonjour, type Browser, type Service } from 'bonjour-service';
import type { DeviceInfo, DiscoveredDevice } from '../types';
import type { DiscoveryService } from '../discovery';
import { createTxtRecord, parseTxtRecord, createDiscoveredDevice } from '../discovery';

// bonjour-service takes the bare service type and forms _<type>._tcp.local.
const SERVICE_TYPE = 'offgrid';

export class NodeDiscovery implements DiscoveryService {
  private bonjour = new Bonjour();
  private browser?: Browser;
  private published?: Service;
  private foundCb?: (device: DiscoveredDevice) => void;
  private lostCb?: (deviceId: string) => void;

  async start(): Promise<void> {
    this.browser = this.bonjour.find({ type: SERVICE_TYPE });
    this.browser.on('up', (service: Service) => {
      const txt = (service.txt ?? {}) as Record<string, string>;
      const host =
        service.addresses?.find((a) => a.includes('.')) ?? service.host ?? '';
      const info = parseTxtRecord(txt, host, service.port);
      if (info) this.foundCb?.(createDiscoveredDevice(info));
    });
    this.browser.on('down', (service: Service) => {
      const txt = (service.txt ?? {}) as Record<string, string>;
      this.lostCb?.(txt.id || service.name);
    });
  }

  async advertise(device: DeviceInfo): Promise<void> {
    this.published = this.bonjour.publish({
      name: `OffGrid-${device.id}`,
      type: SERVICE_TYPE,
      port: device.port,
      txt: createTxtRecord(device),
    });
  }

  async stopAdvertising(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.published) return resolve();
      this.published.stop?.(() => resolve());
      this.published = undefined;
      // stop() may not invoke the callback on all versions; resolve soon anyway.
      setTimeout(resolve, 50);
    });
  }

  onDeviceFound(callback: (device: DiscoveredDevice) => void): void {
    this.foundCb = callback;
  }

  onDeviceLost(callback: (deviceId: string) => void): void {
    this.lostCb = callback;
  }

  async stop(): Promise<void> {
    this.browser?.stop();
    await this.stopAdvertising();
    this.bonjour.destroy();
  }
}
