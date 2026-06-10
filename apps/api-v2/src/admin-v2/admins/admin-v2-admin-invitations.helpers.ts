import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  ALLOWED_ROLE_KEYS,
  type AdminInvitationTokenPayload,
  buildActiveInvitationStatus,
  normalizeEmail,
  toNullableIso,
} from './admin-v2-admins.utils';
import { constants } from '../../shared-common';

type PendingInvitationRecord = {
  id: string;
  email: string;
  expiresAt: Date | null;
  createdAt: Date;
};

type CreatedInvitationRecord = PendingInvitationRecord & {
  auditId: string;
};

type AcceptedAdminRecord = {
  id: string;
  email: string;
};

type InvitationAcceptanceRecord = {
  email: string;
  roleId: string;
  expiresAt: Date | null;
  acceptedAt: Date | null;
};

export function throwInvalidInvitationToken(): never {
  throw new BadRequestException(`Invitation token is invalid`);
}

export function throwInvitationAlreadyAccepted(): never {
  throw new ConflictException(`Invitation has already been accepted`);
}

export function assertAdminEmailAvailable(
  existingAdmin: { deletedAt: Date | null } | null | undefined,
  inactiveMessage: string,
): void {
  if (!existingAdmin) {
    return;
  }
  if (existingAdmin.deletedAt == null) {
    throw new ConflictException(`An active admin with this email already exists`);
  }
  throw new ConflictException(inactiveMessage);
}

export function requireInviteEmail(email?: string): string {
  const normalizedEmail = normalizeEmail(String(email ?? ``));
  if (!normalizedEmail) {
    throw new BadRequestException(`Invite email is required`);
  }
  return normalizedEmail;
}

export function requireInviteRoleKey(roleKey?: string): string {
  const normalizedRoleKey = String(roleKey ?? ``).trim();
  if (!ALLOWED_ROLE_KEYS.has(normalizedRoleKey)) {
    throw new BadRequestException(`Unsupported invite role`);
  }
  return normalizedRoleKey;
}

export function requireInvitationToken(token?: string): string {
  const normalizedToken = String(token ?? ``).trim();
  if (!normalizedToken) {
    throw new BadRequestException(`Invitation token is required`);
  }
  return normalizedToken;
}

export function requireInvitationPassword(password?: string): string {
  const normalizedPassword = String(password ?? ``);
  if (!constants.PASSWORD_RE.test(normalizedPassword)) {
    throw new BadRequestException(constants.INVALID_PASSWORD);
  }
  return normalizedPassword;
}

export function assertInvitationMatchesPayload(
  invitation: InvitationAcceptanceRecord | null | undefined,
  payload: AdminInvitationTokenPayload,
): asserts invitation is InvitationAcceptanceRecord {
  if (
    !invitation ||
    normalizeEmail(invitation.email) !== normalizeEmail(payload.email) ||
    invitation.roleId !== payload.roleId
  ) {
    throwInvalidInvitationToken();
  }
}

export function assertInvitationNotExpired(expiresAt: Date | null): void {
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new ConflictException(`Invitation has expired`);
  }
}

export function buildPendingInvitationResult(existingPending: PendingInvitationRecord, roleKey: string) {
  return {
    invitationId: existingPending.id,
    email: existingPending.email,
    roleKey,
    expiresAt: toNullableIso(existingPending.expiresAt),
    createdAt: existingPending.createdAt.toISOString(),
    alreadyPending: true,
    status: buildActiveInvitationStatus(existingPending.expiresAt, null),
  };
}

export function buildCreatedInvitationResult(
  created: CreatedInvitationRecord,
  roleKey: string,
  notificationSent: boolean,
) {
  return {
    invitationId: created.id,
    email: created.email,
    roleKey,
    expiresAt: toNullableIso(created.expiresAt),
    createdAt: created.createdAt.toISOString(),
    alreadyPending: false,
    notificationSent,
    deliveryStatus: notificationSent ? `sent` : `failed`,
  };
}

export function buildAcceptedInvitationResult(admin: AcceptedAdminRecord) {
  return {
    adminId: admin.id,
    email: admin.email,
    accepted: true as const,
  };
}
