import { D as DiscoveryService, a as DeviceInfo, b as DiscoveredDevice } from '../index-U2pbAoxU.mjs';

declare class NodeDiscovery implements DiscoveryService {
    private bonjour;
    private browser?;
    private published?;
    private foundCb?;
    private lostCb?;
    start(): Promise<void>;
    advertise(device: DeviceInfo): Promise<void>;
    stopAdvertising(): Promise<void>;
    onDeviceFound(callback: (device: DiscoveredDevice) => void): void;
    onDeviceLost(callback: (deviceId: string) => void): void;
    stop(): Promise<void>;
}

export { NodeDiscovery };
