import type { DeviceInfo, DiscoveredDevice } from '../types';

// mDNS Service Configuration
export const MDNS_SERVICE_TYPE = '_easyshare._tcp';
export const MDNS_SERVICE_NAME = 'EasyShare';
export const MDNS_DOMAIN = 'local';

// TXT Record Keys
export const TXT_DEVICE_ID = 'id';
export const TXT_DEVICE_NAME = 'name';
export const TXT_PLATFORM = 'platform';
export const TXT_VERSION = 'version';

/**
 * Create TXT record data for mDNS advertisement
 */
export function createTxtRecord(device: DeviceInfo): Record<string, string> {
  return {
    [TXT_DEVICE_ID]: device.id,
    [TXT_DEVICE_NAME]: device.name,
    [TXT_PLATFORM]: device.platform,
    [TXT_VERSION]: device.version,
  };
}

/**
 * Parse TXT record data from mDNS discovery
 */
export function parseTxtRecord(
  txt: Record<string, string>,
  host: string,
  port: number
): DeviceInfo | null {
  const id = txt[TXT_DEVICE_ID];
  const name = txt[TXT_DEVICE_NAME];
  const platform = txt[TXT_PLATFORM] as 'macos' | 'android';
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
    port,
  };
}

/**
 * Create a DiscoveredDevice from DeviceInfo
 */
export function createDiscoveredDevice(device: DeviceInfo): DiscoveredDevice {
  return {
    ...device,
    lastSeen: Date.now(),
  };
}

/**
 * Check if a discovered device is stale (not seen recently)
 */
export function isDeviceStale(device: DiscoveredDevice, maxAgeMs: number = 30000): boolean {
  return Date.now() - device.lastSeen > maxAgeMs;
}

/**
 * Filter out stale devices from a list
 */
export function filterStaleDevices(
  devices: DiscoveredDevice[],
  maxAgeMs: number = 30000
): DiscoveredDevice[] {
  return devices.filter((device) => !isDeviceStale(device, maxAgeMs));
}

/**
 * Update or add a device to a list of discovered devices
 */
export function updateDeviceList(
  devices: DiscoveredDevice[],
  newDevice: DiscoveredDevice
): DiscoveredDevice[] {
  const existingIndex = devices.findIndex((d) => d.id === newDevice.id);

  if (existingIndex >= 0) {
    // Update existing device
    const updated = [...devices];
    updated[existingIndex] = { ...newDevice, lastSeen: Date.now() };
    return updated;
  }

  // Add new device
  return [...devices, newDevice];
}

/**
 * Remove a device from the list by ID
 */
export function removeDevice(devices: DiscoveredDevice[], deviceId: string): DiscoveredDevice[] {
  return devices.filter((d) => d.id !== deviceId);
}

// Platform-specific discovery interfaces (implemented in desktop/mobile packages)
export interface DiscoveryService {
  start(): Promise<void>;
  stop(): Promise<void>;
  advertise(device: DeviceInfo): Promise<void>;
  stopAdvertising(): Promise<void>;
  onDeviceFound(callback: (device: DiscoveredDevice) => void): void;
  onDeviceLost(callback: (deviceId: string) => void): void;
}
