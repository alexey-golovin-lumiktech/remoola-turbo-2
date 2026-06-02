import { type ExchangeRuleCasePageData } from './page.loader';

export type ExchangeRuleCasePagePermissions = {
  canManage: boolean;
};

export function deriveExchangeRuleCasePagePermissions(
  identity: ExchangeRuleCasePageData[`identity`],
): ExchangeRuleCasePagePermissions {
  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;
  return { canManage };
}
