import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { buildStaleVersionPayload, deriveVersion } from './admin-v2-admins.utils';

export function requireConfirmation(confirmed: boolean | undefined, message: string) {
  if (confirmed !== true) {
    throw new BadRequestException(message);
  }
}

export function requireValidVersion(version?: number): number {
  const expectedVersion = Number(version);
  if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
    throw new BadRequestException(`Valid version is required`);
  }
  return expectedVersion;
}

export function assertAdminFound<T>(target: T | null | undefined): asserts target is T {
  if (!target) {
    throw new NotFoundException(`Admin not found`);
  }
}

export function assertExpectedVersion(updatedAt: Date, expectedVersion: number) {
  if (deriveVersion(updatedAt) !== expectedVersion) {
    throw new ConflictException(buildStaleVersionPayload(updatedAt));
  }
}

export function throwStaleMutationConflict(current: { updatedAt: Date } | null | undefined): never {
  throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
}
