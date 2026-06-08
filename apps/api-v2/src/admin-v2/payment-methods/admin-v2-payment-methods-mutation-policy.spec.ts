import { describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import {
  assertDuplicateEscalationCohort,
  assertPaymentMethodDisableAllowed,
  assertPaymentMethodMutationTargetFound,
  assertPaymentMethodMutationTargetVersion,
  assertPaymentMethodRemoveDefaultAllowed,
  buildAlreadyDisabledPaymentMethodResult,
  buildAlreadyNotDefaultPaymentMethodResult,
  requireDisablePaymentMethodConfirmation,
  requireDisablePaymentMethodReason,
  requireDuplicateEscalationFingerprint,
  requirePaymentMethodMutationVersion,
} from './admin-v2-payment-methods-mutation-policy';

describe(`admin-v2 payment methods mutation policy`, () => {
  it(`rejects invalid mutation versions`, () => {
    expect(() => requirePaymentMethodMutationVersion(undefined)).toThrow(BadRequestException);
    expect(() => requirePaymentMethodMutationVersion(0)).toThrow(BadRequestException);
  });

  it(`requires disable confirmation`, () => {
    expect(() => requireDisablePaymentMethodConfirmation(false)).toThrow(BadRequestException);
  });

  it(`requires a non-empty and bounded disable reason`, () => {
    expect(() => requireDisablePaymentMethodReason(` `)).toThrow(BadRequestException);
    expect(() => requireDisablePaymentMethodReason(`x`.repeat(501))).toThrow(BadRequestException);
    expect(requireDisablePaymentMethodReason(` Fraud signal `)).toBe(`Fraud signal`);
  });

  it(`throws not-found for absent mutation targets`, () => {
    expect(() => assertPaymentMethodMutationTargetFound(null)).toThrow(NotFoundException);
  });

  it(`throws stale-version conflicts with the current version payload`, () => {
    const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);

    expect(() =>
      assertPaymentMethodMutationTargetVersion({ updatedAt }, new Date(`2026-04-16T08:00:00.000Z`).getTime()),
    ).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          error: `STALE_VERSION`,
          currentVersion: updatedAt.getTime(),
        }),
      }),
    );
  });

  it(`rejects soft-deleted targets for disable and remove-default`, () => {
    const deletedTarget = { deletedAt: new Date(`2026-04-16T09:00:00.000Z`) };

    expect(() => assertPaymentMethodDisableAllowed(deletedTarget)).toThrow(ConflictException);
    expect(() => assertPaymentMethodRemoveDefaultAllowed(deletedTarget)).toThrow(ConflictException);
  });

  it(`requires a schema-backed fingerprint and at least one duplicate for escalation`, () => {
    expect(() => requireDuplicateEscalationFingerprint({ stripeFingerprint: null })).toThrow(ConflictException);
    expect(() => assertDuplicateEscalationCohort([])).toThrow(ConflictException);
    expect(requireDuplicateEscalationFingerprint({ stripeFingerprint: ` fp-shared ` })).toBe(`fp-shared`);
  });

  it(`builds already-disabled results with current default-cleared semantics`, () => {
    const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);
    const disabledAt = new Date(`2026-04-16T10:00:00.000Z`);

    expect(
      buildAlreadyDisabledPaymentMethodResult({
        id: `pm-1`,
        consumerId: `consumer-1`,
        defaultSelected: true,
        disabledAt,
        updatedAt,
      }),
    ).toEqual({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      status: `DISABLED`,
      defaultSelected: false,
      disabledAt: disabledAt.toISOString(),
      version: updatedAt.getTime(),
      alreadyDisabled: true,
      defaultCleared: false,
    });
  });

  it(`builds already-not-default results with the current status mapping`, () => {
    const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);

    expect(
      buildAlreadyNotDefaultPaymentMethodResult({
        id: `pm-1`,
        consumerId: `consumer-1`,
        defaultSelected: false,
        disabledAt: null,
        updatedAt,
      }),
    ).toEqual({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      status: `ACTIVE`,
      version: updatedAt.getTime(),
      alreadyNotDefault: true,
    });
  });
});
