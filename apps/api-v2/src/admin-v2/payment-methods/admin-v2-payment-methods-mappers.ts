const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function normalizePage(value?: number): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

export function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

export function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

export function toNullableIso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

export function deriveVersion(updatedAt: Date) {
  return updatedAt.getTime();
}

export function deriveStatus(paymentMethod: { disabledAt: Date | null }) {
  return paymentMethod.disabledAt ? `DISABLED` : `ACTIVE`;
}

export function mapConsumer(consumer: { id: string; email: string | null }) {
  return {
    id: consumer.id,
    email: consumer.email,
  };
}

export function buildStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Payment method has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

export function mapBillingDetails(
  billingDetails:
    | {
        id: string;
        email: string | null;
        name: string | null;
        phone: string | null;
        deletedAt: Date | null;
      }
    | null
    | undefined,
) {
  if (!billingDetails) {
    return null;
  }

  return {
    id: billingDetails.id,
    email: billingDetails.email,
    name: billingDetails.name,
    phone: billingDetails.phone,
    deletedAt: toNullableIso(billingDetails.deletedAt),
  };
}
