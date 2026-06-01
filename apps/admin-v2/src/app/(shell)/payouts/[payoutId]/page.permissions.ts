import { type PayoutCasePageData } from './page.loader';

export type PayoutCasePagePermissions = {
  currentAdminId: string | null;
  canManageEscalation: boolean;
  canSubmitEscalation: boolean;
  ownsAssignment: boolean;
  canManageAssignments: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function derivePayoutCasePagePermissions(
  identity: PayoutCasePageData[`identity`],
  payoutCase: PayoutCasePageData[`payoutCase`],
): PayoutCasePagePermissions {
  const canManageEscalation = identity?.capabilities.includes(`payouts.escalate`) ?? false;
  const canSubmitEscalation = canManageEscalation && payoutCase.actionControls.canEscalate;

  const currentAssignment = payoutCase.assignment.current;
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
    canManageEscalation,
    canSubmitEscalation,
    ownsAssignment,
    canManageAssignments,
    canClaim,
    canRelease,
    canReassign,
  };
}
