import { type ExchangeScheduledCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../../lib/admin-capabilities';
import {
  deriveAssignmentPermissions,
  type AssignmentPermissions,
} from '../../../../../lib/admin-permissions/assignment-permissions';

export type ExchangeScheduledCasePagePermissions = AssignmentPermissions & {
  canManage: boolean;
};

export function deriveExchangeScheduledCasePagePermissions(
  identity: ExchangeScheduledCasePageData[`identity`],
  conversion: ExchangeScheduledCasePageData[`conversion`],
): ExchangeScheduledCasePagePermissions {
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.exchangeManage);
  return {
    canManage,
    ...deriveAssignmentPermissions(identity, conversion.assignment),
  };
}
