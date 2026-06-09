import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { MAX_ASSIGNMENT_REASON_LENGTH, MIN_ASSIGNMENT_REASON_LENGTH } from './admin-v2-assignments.dto';

type AssignmentActorProfile = {
  role: string;
};

type TargetAdminForReassign = {
  deletedAt: Date | null;
} | null;

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

export function requireAssignmentResourceType(value: string | undefined): string {
  if (!value || typeof value !== `string`) {
    throw new BadRequestException(`resourceType is required`);
  }
  return value;
}

export function requireAssignmentId(value: string | undefined): string {
  if (!value || typeof value !== `string`) {
    throw new BadRequestException(`assignmentId is required`);
  }
  return value;
}

export function requireNewAssigneeId(value: string | undefined): string {
  if (!value || typeof value !== `string`) {
    throw new BadRequestException(`newAssigneeId is required`);
  }
  return value;
}

export function assertConfirmedReassign(value: boolean | undefined) {
  if (value !== true) {
    throw new BadRequestException(`Confirmation is required for reassign`);
  }
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

export function assertSuperAdminReassign(profile: AssignmentActorProfile) {
  if (profile.role !== `SUPER_ADMIN`) {
    throw new ForbiddenException(`Reassign requires SUPER_ADMIN`);
  }
}

export function assertNotSelfReassign(newAssigneeId: string, adminId: string) {
  if (newAssigneeId === adminId) {
    throw new BadRequestException(`Reassign to self is not allowed; use release + claim instead`);
  }
}

export function assertTargetAdminForReassign(targetAdmin: TargetAdminForReassign) {
  if (!targetAdmin) {
    throw new NotFoundException(`Target admin not found`);
  }
  if (targetAdmin.deletedAt) {
    throw new BadRequestException(`Target admin is deactivated`);
  }
}
