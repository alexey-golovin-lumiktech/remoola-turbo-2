import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { MAX_ASSIGNMENT_REASON_LENGTH, MIN_ASSIGNMENT_REASON_LENGTH } from './admin-v2-assignments.dto';

type AssignmentActorProfile = {
  role: string;
};

type AdminRefInput = {
  id: string | null;
  email: string | null;
};

type AdminRefOutput = {
  id: string;
  name: null;
  email: string | null;
};

export function mapAdminRef({ id, email }: AdminRefInput): AdminRefOutput | null {
  if (!id) return null;
  return { id, name: null, email };
}

function trimReason(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function validateOptionalAssignmentReason(raw: string | null | undefined): string | null {
  const normalized = trimReason(raw);
  if (normalized == null) return null;
  if (normalized.length > MAX_ASSIGNMENT_REASON_LENGTH) {
    throw new BadRequestException(`Reason is too long (max ${MAX_ASSIGNMENT_REASON_LENGTH} characters)`);
  }
  return normalized;
}

export function validateMandatoryAssignmentReason(raw: string | null | undefined): string {
  const normalized = trimReason(raw);
  if (normalized == null) {
    throw new BadRequestException(`Reason is required`);
  }
  if (normalized.length < MIN_ASSIGNMENT_REASON_LENGTH) {
    throw new BadRequestException(`Reason is too short (min ${MIN_ASSIGNMENT_REASON_LENGTH} characters)`);
  }
  if (normalized.length > MAX_ASSIGNMENT_REASON_LENGTH) {
    throw new BadRequestException(`Reason is too long (max ${MAX_ASSIGNMENT_REASON_LENGTH} characters)`);
  }
  return normalized;
}

export function assertExpectedReleasedAtNull(value: number) {
  if (value !== 0) {
    throw new BadRequestException(`expectedReleasedAtNull must be 0`);
  }
}

export function assertCanReleaseAssignment(params: {
  assignedTo: string;
  adminId: string;
  profile: AssignmentActorProfile;
}) {
  const isOwner = params.assignedTo === params.adminId;
  const isSuperAdmin = params.profile.role === `SUPER_ADMIN`;
  if (!isOwner && !isSuperAdmin) {
    throw new ForbiddenException(`Only the assigned owner or a super-admin can release this assignment`);
  }
}
