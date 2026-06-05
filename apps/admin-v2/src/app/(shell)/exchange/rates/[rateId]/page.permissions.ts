import { type ExchangeRateCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../../lib/admin-capabilities';

export type ExchangeRateCasePagePermissions = {
  canManage: boolean;
};

export function deriveExchangeRateCasePagePermissions(
  identity: ExchangeRateCasePageData[`identity`],
): ExchangeRateCasePagePermissions {
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.exchangeManage);
  return { canManage };
}
