import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ADMIN_V2_SCHEMA_ROLES, OVERRIDABLE_ADMIN_V2_CAPABILITIES } from '../admin-v2-access';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;
export const REASON_MAX_LENGTH = 500;
export const RECENT_ACTIVITY_LIMIT = 20;
export const ALLOWED_ROLE_KEYS = new Set<string>(ADMIN_V2_SCHEMA_ROLES);
export const ADMIN_PERMISSION_OVERRIDE_CAPABILITIES = new Set<string>(OVERRIDABLE_ADMIN_V2_CAPABILITIES);
export const ADMIN_PERMISSION_OVERRIDE_MODES = new Set<string>([`inherit`, `grant`, `deny`]);

export type AdminPermissionOverrideMode = `inherit` | `grant` | `deny`;

export type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type AdminInvitationTokenPayload = {
  sub: string;
  email: string;
  roleId: string;
  typ: `admin_invitation`;
  scope: `admin_v2`;
};

export function normalizePage(value?: number): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

export function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeReason(value?: string | null): string | null {
  const normalized = value?.trim() ?? ``;
  if (!normalized) {
    return null;
  }
  if (normalized.length > REASON_MAX_LENGTH) {
    throw new BadRequestException(`Reason is too long`);
  }
  return normalized;
}

export function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

export function toNullableIso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null;
}

export function deriveStatus(deletedAt: Date | null): `ACTIVE` | `INACTIVE` {
  return deletedAt ? `INACTIVE` : `ACTIVE`;
}

export function toAdminType(roleKey: string): $Enums.AdminType {
  if (roleKey === `SUPER_ADMIN`) {
    return $Enums.AdminType.SUPER;
  }
  if (ALLOWED_ROLE_KEYS.has(roleKey)) {
    return $Enums.AdminType.ADMIN;
  }
  throw new BadRequestException(`Unsupported admin role key`);
}

export function toPermissionOverrideGrant(mode: AdminPermissionOverrideMode): boolean | null {
  if (mode === `grant`) return true;
  if (mode === `deny`) return false;
  return null;
}

export function buildStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Admin record has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

export function buildActiveInvitationStatus(
  expiresAt: Date | null,
  acceptedAt: Date | null,
): `accepted` | `expired` | `pending` {
  if (acceptedAt) return `accepted`;
  if (expiresAt && expiresAt.getTime() <= Date.now()) return `expired`;
  return `pending`;
}
