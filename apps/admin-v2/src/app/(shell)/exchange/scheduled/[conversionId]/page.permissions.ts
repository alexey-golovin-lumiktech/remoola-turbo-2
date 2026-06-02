import { type ExchangeScheduledCasePageData } from './page.loader';

export type ExchangeScheduledCasePagePermissions = {
  canManage: boolean;
  currentAdminId: string | null;
  ownsAssignment: boolean;
  canManageAssignments: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function deriveExchangeScheduledCasePagePermissions(
  identity: ExchangeScheduledCasePageData[`identity`],
  conversion: ExchangeScheduledCasePageData[`conversion`],
): ExchangeScheduledCasePagePermissions {
  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;

  const currentAssignment = conversion.assignment.current;
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
    canManage,
    currentAdminId,
    ownsAssignment,
    canManageAssignments,
    canClaim,
    canRelease,
    canReassign,
  };
}
