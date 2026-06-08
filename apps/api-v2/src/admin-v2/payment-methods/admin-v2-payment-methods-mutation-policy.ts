import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { buildStaleVersionPayload, deriveStatus, deriveVersion } from './admin-v2-payment-methods-mappers';

const REASON_MAX_LENGTH = 500;

type PaymentMethodMutationTarget = {
  id: string;
  consumerId: string;
  defaultSelected: boolean;
  disabledAt: Date | null;
  deletedAt: Date | null;
  updatedAt: Date;
  stripeFingerprint?: string | null;
};

export function requirePaymentMethodMutationVersion(version?: number): number {
  const expectedVersion = Number(version);
  if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
    throw new BadRequestException(`Valid version is required`);
  }
  return expectedVersion;
}

export function requireDisablePaymentMethodConfirmation(confirmed?: boolean): void {
  if (confirmed !== true) {
    throw new BadRequestException(`Confirmation is required for payment method disable`);
  }
}

export function requireDisablePaymentMethodReason(reason?: string): string {
  const normalizedReason = reason?.trim();
  if (!normalizedReason) {
    throw new BadRequestException(`Disable reason is required`);
  }
  if (normalizedReason.length > REASON_MAX_LENGTH) {
    throw new BadRequestException(`Disable reason is too long`);
  }
  return normalizedReason;
}

export function assertPaymentMethodMutationTargetFound<T>(
  paymentMethod: T | null | undefined,
): asserts paymentMethod is T {
  if (!paymentMethod) {
    throw new NotFoundException(`Payment method not found`);
  }
}

export function assertPaymentMethodMutationTargetVersion(
  paymentMethod: Pick<PaymentMethodMutationTarget, `updatedAt`>,
  expectedVersion: number,
): void {
  if (deriveVersion(paymentMethod.updatedAt) !== expectedVersion) {
    throw new ConflictException(buildStaleVersionPayload(paymentMethod.updatedAt));
  }
}

export function assertPaymentMethodDisableAllowed(paymentMethod: Pick<PaymentMethodMutationTarget, `deletedAt`>): void {
  if (paymentMethod.deletedAt) {
    throw new ConflictException(`Soft-deleted payment method cannot be disabled`);
  }
}

export function assertPaymentMethodRemoveDefaultAllowed(
  paymentMethod: Pick<PaymentMethodMutationTarget, `deletedAt`>,
): void {
  if (paymentMethod.deletedAt) {
    throw new ConflictException(`Soft-deleted payment method cannot remove default`);
  }
}

export function buildAlreadyDisabledPaymentMethodResult(
  paymentMethod: Pick<
    PaymentMethodMutationTarget,
    `id` | `consumerId` | `defaultSelected` | `disabledAt` | `updatedAt`
  >,
) {
  return {
    paymentMethodId: paymentMethod.id,
    consumerId: paymentMethod.consumerId,
    status: `DISABLED` as const,
    defaultSelected: false,
    disabledAt: paymentMethod.disabledAt?.toISOString() ?? null,
    version: deriveVersion(paymentMethod.updatedAt),
    alreadyDisabled: true,
    defaultCleared: !paymentMethod.defaultSelected,
  };
}

export function buildAlreadyNotDefaultPaymentMethodResult(
  paymentMethod: Pick<
    PaymentMethodMutationTarget,
    `id` | `consumerId` | `defaultSelected` | `disabledAt` | `updatedAt`
  >,
) {
  return {
    paymentMethodId: paymentMethod.id,
    consumerId: paymentMethod.consumerId,
    defaultSelected: false,
    status: deriveStatus(paymentMethod),
    version: deriveVersion(paymentMethod.updatedAt),
    alreadyNotDefault: true,
  };
}

export function requireDuplicateEscalationFingerprint(
  paymentMethod: Pick<PaymentMethodMutationTarget, `stripeFingerprint`>,
): string {
  const fingerprint = paymentMethod.stripeFingerprint?.trim();
  if (!fingerprint) {
    throw new ConflictException(`Duplicate escalation requires a schema-backed fingerprint`);
  }
  return fingerprint;
}

export function assertDuplicateEscalationCohort(duplicatePaymentMethodIds: readonly string[]): void {
  if (duplicatePaymentMethodIds.length === 0) {
    throw new ConflictException(`Duplicate escalation requires at least one matching fingerprint duplicate`);
  }
}
