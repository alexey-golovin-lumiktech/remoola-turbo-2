import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { adminErrorCodes } from '@remoola/shared-constants';

import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuidOrThrow(raw: string | null | undefined, headerName: string) {
  const value = raw?.trim();
  if (!value) {
    throw new BadRequestException(`${headerName} header is required`);
  }
  if (!UUID_REGEX.test(value)) {
    throw new BadRequestException(`${headerName} header must be a UUID`);
  }
  return value;
}

export function requireValidVersion(version?: number): number {
  const expectedVersion = Number(version);
  if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
    throw new BadRequestException(`Valid version is required`);
  }
  return expectedVersion;
}

export function assertExchangeRuleFound<T>(rule: T | null | undefined): asserts rule is T {
  if (!rule) {
    throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
  }
}

export function assertExpectedExchangeRuleVersion(updatedAt: Date, expectedVersion: number) {
  if (deriveVersion(updatedAt) !== expectedVersion) {
    throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, updatedAt));
  }
}

export function assertLockedExchangeRuleFound<T extends { deleted_at: Date | null }>(
  rule: T | null | undefined,
): asserts rule is T & { deleted_at: null } {
  if (!rule || rule.deleted_at) {
    throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
  }
}
