// Device cap (open-core monetization lever).
//
// The COUNT CHECK lives here in the open core: free tier pairs up to
// FREE_DEVICE_CAP devices; beyond that requires a paid entitlement. The
// ENTITLEMENT itself (what the limit is) is injected by the host's private pro
// layer via DeviceCapPolicy.limit() - this package never verifies billing.

export const FREE_DEVICE_CAP = 2;

export interface DeviceCapPolicy {
  /** Max distinct paired devices allowed. Free returns FREE_DEVICE_CAP; a pro
   * entitlement returns a higher number or Infinity. */
  limit(): number;
}

/** A fixed free-tier policy. */
export const freePolicy: DeviceCapPolicy = { limit: () => FREE_DEVICE_CAP };

/** Build a policy from a pro flag supplied by the host's entitlement check. */
export function policyFor(isPro: boolean, proLimit: number = Infinity): DeviceCapPolicy {
  return { limit: () => (isPro ? proLimit : FREE_DEVICE_CAP) };
}

export interface DeviceCap {
  policy: DeviceCapPolicy;
  /** How many distinct devices are already paired (from the host's store). */
  pairedCount: () => number;
  /** Whether this device id is already paired (re-pairing does not count). */
  isKnown: (deviceId: string) => boolean;
}

/** True if pairing with `deviceId` is allowed under the cap. */
export function pairingAllowed(cap: DeviceCap | undefined, deviceId: string): boolean {
  if (!cap) return true;
  if (cap.isKnown(deviceId)) return true; // re-pair an existing device
  return cap.pairedCount() < cap.policy.limit();
}
