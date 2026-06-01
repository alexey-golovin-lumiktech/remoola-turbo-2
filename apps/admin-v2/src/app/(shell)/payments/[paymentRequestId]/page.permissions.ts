import { type getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { type getPaymentCaseResult } from '../../../../lib/admin-api/payments.server';

type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type PaymentCaseResult = Awaited<ReturnType<typeof getPaymentCaseResult>>;
type PaymentCaseReady = Extract<PaymentCaseResult, { status: `ready` }>[`data`];

export type PaymentPagePermissions = {
  ownsAssignment: boolean;
  canManageAssignments: boolean;
  canReassignAssignments: boolean;
  canReverse: boolean;
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
};

export function derivePaymentPagePermissions(
  identity: Identity,
  paymentCase: PaymentCaseReady,
): PaymentPagePermissions {
  const currentAssignment = paymentCase.assignment.current;
  const currentAdminId = identity?.id ?? null;
  const ownsAssignment = Boolean(
    currentAssignment && currentAdminId && currentAssignment.assignedTo.id === currentAdminId,
  );
  const canManageAssignments = Boolean(identity?.capabilities?.includes(`assignments.manage`));
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canReverse = Boolean(identity?.capabilities?.includes(`payments.reverse`));
  const canClaim = canManageAssignments && !currentAssignment;
  const canRelease = Boolean(currentAssignment && canManageAssignments && (ownsAssignment || canReassignAssignments));
  const canReassign = Boolean(currentAssignment && canReassignAssignments);
  return {
    ownsAssignment,
    canManageAssignments,
    canReassignAssignments,
    canReverse,
    canClaim,
    canRelease,
    canReassign,
  };
}
