import { type ExchangeRuleCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../../lib/admin-capabilities';

export type ExchangeRuleCasePagePermissions = {
  canManage: boolean;
};

export function deriveExchangeRuleCasePagePermissions(
  identity: ExchangeRuleCasePageData[`identity`],
): ExchangeRuleCasePagePermissions {
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.exchangeManage);
  return { canManage };
}
