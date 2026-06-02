import { type PayoutCasePageData } from './page.loader';
import {
  deriveAssignmentPermissions,
  type AssignmentPermissions,
} from '../../../../lib/admin-permissions/assignment-permissions';

export type PayoutCasePagePermissions = AssignmentPermissions & {
  canManageEscalation: boolean;
  canSubmitEscalation: boolean;
};

export function derivePayoutCasePagePermissions(
  identity: PayoutCasePageData[`identity`],
  payoutCase: PayoutCasePageData[`payoutCase`],
): PayoutCasePagePermissions {
  const canManageEscalation = identity?.capabilities.includes(`payouts.escalate`) ?? false;
  const canSubmitEscalation = canManageEscalation && payoutCase.actionControls.canEscalate;
  return {
    canManageEscalation,
    canSubmitEscalation,
    ...deriveAssignmentPermissions(identity, payoutCase.assignment),
  };
}
