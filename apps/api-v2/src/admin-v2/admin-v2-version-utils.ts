export type StaleVersionPayload = {
  error: `STALE_VERSION`;
  message: string;
  currentVersion: number;
  currentUpdatedAt: string;
  recommendedAction: `reload`;
};

export function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

export function toNullableIso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null;
}

export function buildStaleVersionPayload(resourceLabel: string, currentUpdatedAt: Date): StaleVersionPayload {
  return {
    error: `STALE_VERSION`,
    message: `${resourceLabel} has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}
