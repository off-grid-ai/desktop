"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/adapters/node-discovery.ts
var node_discovery_exports = {};
__export(node_discovery_exports, {
  NodeDiscovery: () => NodeDiscovery
});
module.exports = __toCommonJS(node_discovery_exports);
var import_bonjour_service = require("bonjour-service");

// src/discovery/index.ts
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

// src/adapters/node-discovery.ts
var SERVICE_TYPE = "offgrid";
var NodeDiscovery = class {
  bonjour = new import_bonjour_service.Bonjour();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NodeDiscovery
});
