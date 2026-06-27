// @offgrid/sync - platform-agnostic device-to-device sync engine.
// Extracted from EasyShare. Pairing, discovery contracts, encrypted framed
// messaging, and transfer live here; the actual sockets and mDNS are provided
// by the host through TransportBridge / DiscoveryService so this package is
// embeddable in Off Grid Desktop (Node) and Off Grid Mobile (React Native).

// Types
export * from './types';

// Crypto utilities
export * from './crypto';

// Discovery protocol + DiscoveryService interface
export * from './discovery';

// Pairing protocol / state machine
export * from './pairing';

// Transfer protocol
export * from './transfer';

// Message protocol (serialization, framing, encryption)
export * from './protocol';

// Wire codec (length-prefixed plaintext/encrypted frames)
export * from './wire';

// Transport abstraction (sockets injected by the host)
export * from './transport';

// High-level engine that ties pairing + messaging over a transport
export * from './engine';

// Device cap (open-core 2 free / 3+ paid)
export * from './cap';

// Discovery orchestrator (auto-reconnect known devices on discovery)
export * from './orchestrator';

export const VERSION = '0.0.1';
export const APP_NAME = 'Off Grid Sync';
