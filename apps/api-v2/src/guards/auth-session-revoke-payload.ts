export function buildAuthSessionRevokePayload(reason: string, now = new Date()) {
  return {
    revokedAt: now,
    invalidatedReason: reason,
    lastUsedAt: now,
  };
}
