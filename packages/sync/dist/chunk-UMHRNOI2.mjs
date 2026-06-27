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

export {
  MDNS_SERVICE_TYPE,
  MDNS_SERVICE_NAME,
  MDNS_DOMAIN,
  TXT_DEVICE_ID,
  TXT_DEVICE_NAME,
  TXT_PLATFORM,
  TXT_VERSION,
  createTxtRecord,
  parseTxtRecord,
  createDiscoveredDevice,
  isDeviceStale,
  filterStaleDevices,
  updateDeviceList,
  removeDevice
};
