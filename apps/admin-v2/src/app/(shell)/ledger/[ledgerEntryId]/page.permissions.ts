import { type LedgerEntryCasePageData } from './page.loader';

export type LedgerEntryCasePagePermissions = {
  currentAdminId: string | null;
  ownsAssignment: boolean;
  canManageAssignments: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function deriveLedgerEntryCasePagePermissions(
  identity: LedgerEntryCasePageData[`identity`],
  ledgerCase: LedgerEntryCasePageData[`ledgerCase`],
): LedgerEntryCasePagePermissions {
  const currentAssignment = ledgerCase.assignment.current;
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
