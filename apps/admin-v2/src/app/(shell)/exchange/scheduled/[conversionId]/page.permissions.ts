import { type ExchangeScheduledCasePageData } from './page.loader';
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
  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;
  return {
    canManage,
    ...deriveAssignmentPermissions(identity, conversion.assignment),
  };
}
