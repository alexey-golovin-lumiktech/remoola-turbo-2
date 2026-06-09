import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import {
  assertConfirmedConsumerSuspension,
  assertConfirmedForceLogout,
  assertValidVersion,
  buildAlreadySuspendedResult,
  buildForceLogoutAuditMetadata,
  buildForceLogoutResult,
  buildResendEmailAuditMetadata,
  buildSuspendAuditMetadata,
  buildSuspendedResult,
  normalizeOptionalReason,
  validateConsumerSuspensionReason,
  validateNoteContent,
  validateRequiredFlag,
} from './admin-v2-consumer-action-policy';
import { mapConsumerDisplayName, mapPaymentMethodStatus } from './admin-v2-consumer-query-helpers';

describe(`admin-v2 consumer pure helpers`, () => {
  it(`maps consumer display name with existing fallback behavior`, () => {
    expect(mapConsumerDisplayName({ organizationDetails: { name: `Acme Ltd` } })).toBe(`Acme Ltd`);
    expect(
      mapConsumerDisplayName({
        personalDetails: { firstName: `Ada`, lastName: `Lovelace` },
      }),
    ).toBe(`Ada Lovelace`);
    expect(mapConsumerDisplayName({ personalDetails: { firstName: null, lastName: null } })).toBe(``);
  });

  it(`maps payment method status from disabledAt only`, () => {
    expect(mapPaymentMethodStatus({ disabledAt: null })).toBe(`ACTIVE`);
    expect(mapPaymentMethodStatus({ disabledAt: new Date(`2026-04-20T10:00:00.000Z`) })).toBe(`DISABLED`);
  });

  it(`validates note content, flags, and versions`, () => {
    expect(validateNoteContent(`  note  `)).toBe(`note`);
    expect(() => validateNoteContent(`   `)).toThrow(new BadRequestException(`Note content is required`));
    expect(() => validateNoteContent(`x`.repeat(4001))).toThrow(new BadRequestException(`Note content is too long`));

    expect(validateRequiredFlag(` Needs Review `)).toBe(`needs_review`);
    expect(() => validateRequiredFlag(`!!!`)).toThrow(new BadRequestException(`Flag is required`));

    expect(() => assertValidVersion(1)).not.toThrow();
    expect(() => assertValidVersion(0)).toThrow(new BadRequestException(`Valid version is required`));
    expect(() => assertValidVersion(Number.NaN)).toThrow(new BadRequestException(`Valid version is required`));
  });

  it(`normalizes reasons and preserves suspension reason validation`, () => {
    expect(normalizeOptionalReason(`  needs review  `)).toBe(`needs review`);
    expect(normalizeOptionalReason(`   `)).toBeNull();
    expect(normalizeOptionalReason(`x`.repeat(501))).toHaveLength(500);
    expect(validateConsumerSuspensionReason(`  regulatory block  `)).toBe(`regulatory block`);
    expect(() => validateConsumerSuspensionReason(`   `)).toThrow(BadRequestException);
    expect(() => validateConsumerSuspensionReason(`x`.repeat(501))).toThrow(BadRequestException);
  });

  it(`keeps confirmation guards and audit/result builders stable`, () => {
    expect(() => assertConfirmedForceLogout(true)).not.toThrow();
    expect(() => assertConfirmedForceLogout(false)).toThrow(
      new BadRequestException(`Confirmation is required for force logout`),
    );
    expect(() => assertConfirmedConsumerSuspension(true)).not.toThrow();
    expect(() => assertConfirmedConsumerSuspension(false)).toThrow(
      new BadRequestException(`Confirmation is required for consumer suspension`),
    );

    expect(
      buildForceLogoutAuditMetadata({
        activeSessionsBefore: 2,
        consumerEmail: `consumer@example.com`,
      }),
    ).toEqual({
      activeSessionsBefore: 2,
      consumerEmail: `consumer@example.com`,
    });
    expect(
      buildForceLogoutResult({
        consumerId: `consumer-1`,
        activeSessionsBefore: 0,
      }),
    ).toEqual({
      consumerId: `consumer-1`,
      revokedSessionsCount: 0,
      alreadyRevoked: true,
    });

    const suspendedAt = new Date(`2026-04-24T09:00:00.000Z`);
    expect(
      buildSuspendAuditMetadata({
        consumerEmail: `consumer@example.com`,
        reason: `Regulatory block`,
        suspendedAt,
        emailDispatched: false,
      }),
    ).toEqual({
      consumerEmail: `consumer@example.com`,
      reason: `Regulatory block`,
      suspendedAt,
      emailKind: `consumer_suspension`,
      emailDispatched: false,
    });
    expect(
      buildAlreadySuspendedResult({
        consumerId: `consumer-1`,
        suspendedAt,
        alreadySuspended: true,
      }),
    ).toEqual({
      consumerId: `consumer-1`,
      suspendedAt,
      alreadySuspended: true,
      emailDispatched: false,
    });
    expect(
      buildSuspendedResult({
        consumerId: `consumer-1`,
        suspendedAt,
        emailDispatched: true,
      }),
    ).toEqual({
      consumerId: `consumer-1`,
      suspendedAt,
      alreadySuspended: false,
      emailDispatched: true,
    });

    expect(
      buildResendEmailAuditMetadata({
        consumerEmail: `consumer@example.com`,
        requestedEmailKind: `password_recovery`,
        dispatchedEmailKind: `password_reset`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    ).toEqual({
      consumerEmail: `consumer@example.com`,
      requestedEmailKind: `password_recovery`,
      dispatchedEmailKind: `password_reset`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
  });
});
