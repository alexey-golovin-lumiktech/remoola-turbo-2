import { z } from 'zod';

import { type AdminV2AdminRef } from './responses';

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

export function isAdminV2AssignableResourceType(value: string): value is AdminV2AssignableResourceType {
  return (ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES as readonly string[]).includes(value);
}

export const adminV2AssignmentClaimBodySchema = z.object({
  resourceType: z.enum(ADMIN_V2_ASSIGNABLE_RESOURCE_TYPES),
  resourceId: z.uuid(),
  reason: z.string().trim().max(ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH).optional(),
});

export const adminV2AssignmentReleaseBodySchema = z.object({
  expectedReleasedAtNull: z.literal(0),
  assignmentId: z.uuid(),
  reason: z.string().trim().max(ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH).optional(),
});

export const adminV2AssignmentReassignBodySchema = z.object({
  expectedReleasedAtNull: z.literal(0),
  assignmentId: z.uuid(),
  newAssigneeId: z.uuid(),
  confirmed: z.boolean(),
  reason: z.string().trim().min(ADMIN_V2_MIN_ASSIGNMENT_REASON_LENGTH).max(ADMIN_V2_MAX_ASSIGNMENT_REASON_LENGTH),
});

export type AdminV2AssignmentReassignBody = z.infer<typeof adminV2AssignmentReassignBodySchema>;
export type AdminV2AssignmentReleaseBody = z.infer<typeof adminV2AssignmentReleaseBodySchema>;
export type AdminV2AssignmentClaimBody = z.infer<typeof adminV2AssignmentClaimBodySchema>;
