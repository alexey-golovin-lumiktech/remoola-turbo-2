import { BadRequestException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

const FLAG_MAX_LEN = 64;
const REASON_MAX_LEN = 500;
const NOTE_MAX_LEN = 4000;

export function normalizeFlag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, `_`)
    .replace(/^_+|_+$/g, ``)
    .slice(0, FLAG_MAX_LEN);
}

export function normalizeOptionalReason(raw: string | null | undefined): string | null {
  return raw?.trim() ? raw.trim().slice(0, REASON_MAX_LEN) : null;
}

export function validateNoteContent(raw: string): string {
  const normalizedContent = raw.trim();
  if (!normalizedContent) {
    throw new BadRequestException(`Note content is required`);
  }
  if (normalizedContent.length > NOTE_MAX_LEN) {
    throw new BadRequestException(`Note content is too long`);
  }
  return normalizedContent;
}

export function validateRequiredFlag(raw: string): string {
  const normalizedFlag = normalizeFlag(raw);
  if (!normalizedFlag) {
    throw new BadRequestException(`Flag is required`);
  }
  return normalizedFlag;
}

export function assertValidVersion(version: number) {
  if (!Number.isFinite(version) || version < 1) {
    throw new BadRequestException(`Valid version is required`);
  }
}

export function assertConfirmedForceLogout(value: boolean | undefined) {
  if (value !== true) {
    throw new BadRequestException(`Confirmation is required for force logout`);
  }
}

export function assertConfirmedConsumerSuspension(value: boolean | undefined) {
  if (value !== true) {
    throw new BadRequestException(`Confirmation is required for consumer suspension`);
  }
}

export function validateConsumerSuspensionReason(raw: string | null | undefined): string {
  const reason = raw?.trim();
  if (!reason) {
    throw new BadRequestException(`Suspension reason is required`);
  }
  if (reason.length > REASON_MAX_LEN) {
    throw new BadRequestException(`Suspension reason is too long`);
  }
  return reason;
}

export function buildForceLogoutAuditMetadata(params: { activeSessionsBefore: number; consumerEmail: string }) {
  return {
    activeSessionsBefore: params.activeSessionsBefore,
    consumerEmail: params.consumerEmail,
  };
}

export function buildForceLogoutResult(params: { consumerId: string; activeSessionsBefore: number }) {
  return {
    consumerId: params.consumerId,
    revokedSessionsCount: params.activeSessionsBefore,
    alreadyRevoked: params.activeSessionsBefore === 0,
  };
}

export function buildSuspendAuditMetadata(params: {
  consumerEmail: string;
  reason: string;
  suspendedAt: Date;
  emailDispatched: boolean;
}) {
  return {
    consumerEmail: params.consumerEmail,
    reason: params.reason,
    suspendedAt: params.suspendedAt,
    emailKind: `consumer_suspension` as const,
    emailDispatched: params.emailDispatched,
  };
}

export function buildAlreadySuspendedResult(params: {
  consumerId: string;
  suspendedAt: Date | null;
  alreadySuspended: boolean;
}) {
  return {
    consumerId: params.consumerId,
    suspendedAt: params.suspendedAt,
    alreadySuspended: params.alreadySuspended,
    emailDispatched: false,
  };
}

export function buildSuspendedResult(params: { consumerId: string; suspendedAt: Date; emailDispatched: boolean }) {
  return {
    consumerId: params.consumerId,
    suspendedAt: params.suspendedAt,
    alreadySuspended: false,
    emailDispatched: params.emailDispatched,
  };
}

export function buildResendEmailAuditMetadata(params: {
  consumerEmail: string;
  requestedEmailKind: `signup_verification` | `password_recovery`;
  dispatchedEmailKind: `signup_verification` | `password_reset` | `google_signin_recovery`;
  appScope: ConsumerAppScope;
}) {
  return {
    consumerEmail: params.consumerEmail,
    requestedEmailKind: params.requestedEmailKind,
    dispatchedEmailKind: params.dispatchedEmailKind,
    appScope: params.appScope,
  };
}
