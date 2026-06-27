import {
  createDiscoveredDevice,
  createTxtRecord,
  parseTxtRecord
} from "../chunk-UMHRNOI2.mjs";

// src/adapters/node-discovery.ts
import { Bonjour } from "bonjour-service";
var SERVICE_TYPE = "offgrid";
var NodeDiscovery = class {
  bonjour = new Bonjour();
  browser;
  published;
  foundCb;
  lostCb;
  async start() {
    this.browser = this.bonjour.find({ type: SERVICE_TYPE });
    this.browser.on("up", (service) => {
      const txt = service.txt ?? {};
      const host = service.addresses?.find((a) => a.includes(".")) ?? service.host ?? "";
      const info = parseTxtRecord(txt, host, service.port);
      if (info) this.foundCb?.(createDiscoveredDevice(info));
    });
    this.browser.on("down", (service) => {
      const txt = service.txt ?? {};
      this.lostCb?.(txt.id || service.name);
    });
  }
  async advertise(device) {
    this.published = this.bonjour.publish({
      name: `OffGrid-${device.id}`,
      type: SERVICE_TYPE,
      port: device.port,
      txt: createTxtRecord(device)
    });
  }
  async stopAdvertising() {
    await new Promise((resolve) => {
      if (!this.published) return resolve();
      this.published.stop?.(() => resolve());
      this.published = void 0;
      setTimeout(resolve, 50);
    });
  }
  onDeviceFound(callback) {
    this.foundCb = callback;
  }
  onDeviceLost(callback) {
    this.lostCb = callback;
  }
  async stop() {
    this.browser?.stop();
    await this.stopAdvertising();
    this.bonjour.destroy();
  }
};
export {
  NodeDiscovery
};
