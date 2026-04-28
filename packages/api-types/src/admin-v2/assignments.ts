import { z } from 'zod';

export const ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES = [
  `verification`,
  `ledger_entry`,
  `payment_request`,
  `payout`,
  `document`,
  `fx_conversion`,
] as const;
export type AdminV2AssignableResourceType = (typeof ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES)[number];

export const ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH = 10;
export const ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH = 500;

export type AdminV2AdminRef = { id: string; name: string | null; email: string | null };

export type AdminV2AssignmentContextSummary = {
  id: string;
  assignedTo: AdminV2AdminRef;
  assignedBy: AdminV2AdminRef | null;
  assignedAt: string;
  reason: string | null;
  expiresAt: string | null;
};

export type AdminV2AssignmentContextHistoryItem = AdminV2AssignmentContextSummary & {
  releasedAt: string | null;
  releasedBy: AdminV2AdminRef | null;
};

export type AdminV2AssignmentContext = {
  current: AdminV2AssignmentContextSummary | null;
  history: AdminV2AssignmentContextHistoryItem[];
};

export type AdminV2AssignmentClaimBody = {
  resourceType: AdminV2AssignableResourceType;
  resourceId: string;
  reason?: string;
};

export type AdminV2AssignmentReleaseBody = {
  assignmentId: string;
  reason?: string;
  expectedReleasedAtNull: number;
};

export type AdminV2AssignmentReassignBody = {
  assignmentId: string;
  newAssigneeId: string;
  confirmed: boolean;
  reason: string;
  expectedReleasedAtNull: number;
};

export function isAdminV2AssignableResourceType(value: string): value is AdminV2AssignableResourceType {
  return (ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES as readonly string[]).includes(value);
}

export const adminV2AssignmentClaimBodySchema = z.object({
  resourceType: z.enum(ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES),
  resourceId: z.string().uuid(),
  reason: z.string().trim().max(ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH).optional(),
});

export const adminV2AssignmentReleaseBodySchema = z.object({
  expectedReleasedAtNull: z.literal(0),
  assignmentId: z.string().uuid(),
  reason: z.string().trim().max(ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH).optional(),
});

export const adminV2AssignmentReassignBodySchema = z.object({
  expectedReleasedAtNull: z.literal(0),
  assignmentId: z.string().uuid(),
  newAssigneeId: z.string().uuid(),
  confirmed: z.boolean(),
  reason: z.string().trim().min(ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH).max(ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH),
});
