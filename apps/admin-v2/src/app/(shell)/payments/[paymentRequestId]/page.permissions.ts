import { type getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { type getPaymentCaseResult } from '../../../../lib/admin-api/payments.server';
import {
  deriveAssignmentPermissions,
  type AssignmentPermissions,
} from '../../../../lib/admin-permissions/assignment-permissions';

type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type PaymentCaseResult = Awaited<ReturnType<typeof getPaymentCaseResult>>;
type PaymentCaseReady = Extract<PaymentCaseResult, { status: `ready` }>[`data`];

export type PaymentPagePermissions = AssignmentPermissions & {
  canReassignAssignments: boolean;
  canReverse: boolean;
};

export function derivePaymentPagePermissions(
  identity: Identity,
  paymentCase: PaymentCaseReady,
): PaymentPagePermissions {
  const canReassignAssignments = identity?.role === `SUPER_ADMIN`;
  const canReverse = Boolean(identity?.capabilities?.includes(`payments.reverse`));
  return {
    canReassignAssignments,
    canReverse,
    ...deriveAssignmentPermissions(identity, paymentCase.assignment),
  };
}
