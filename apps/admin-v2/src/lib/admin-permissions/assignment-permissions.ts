import { type AdminIdentity } from '../admin-api/types';

export type AssignmentSurface = {
  current: { assignedTo: { id: string } } | null;
};

export type AssignmentPermissions = {
  currentAdminId: string | null;
  ownsAssignment: boolean;
  canManageAssignments: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function deriveAssignmentPermissions(
  identity: AdminIdentity | null | undefined,
  assignment: AssignmentSurface,
): AssignmentPermissions {
  const currentAssignment = assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);

  return {
    currentAdminId,
    ownsAssignment,
    canManageAssignments,
    canClaim,
    canRelease,
    canReassign,
  };
}
