import { type VerificationCasePageData } from './page.loader';

export type VerificationCasePagePermissions = {
  currentAdminId: string | null;
  ownsAssignment: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function deriveVerificationCasePagePermissions(
  identity: VerificationCasePageData[`identity`],
  verificationCase: VerificationCasePageData[`verificationCase`],
): VerificationCasePagePermissions {
  const controls = verificationCase.decisionControls;
  const currentAssignment = verificationCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canClaim = controls.canManageAssignments && !currentAssignment;
  const canRelease = Boolean(
    currentAssignment && controls.canManageAssignments && (ownsAssignment || controls.canReassignAssignments),
  );
  const canReassign = Boolean(currentAssignment && controls.canReassignAssignments);
  return { currentAdminId, ownsAssignment, canClaim, canRelease, canReassign };
}
