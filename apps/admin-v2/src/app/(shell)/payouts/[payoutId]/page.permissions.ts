import { type PayoutCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';
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
  const canManageEscalation = hasAdminCapability(identity, ADMIN_CAPABILITIES.payoutsEscalate);
  const canSubmitEscalation = canManageEscalation && payoutCase.actionControls.canEscalate;
  return {
    canManageEscalation,
    canSubmitEscalation,
    ...deriveAssignmentPermissions(identity, payoutCase.assignment),
  };
}
