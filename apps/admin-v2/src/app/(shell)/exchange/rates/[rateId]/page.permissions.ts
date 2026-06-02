import { type ExchangeRateCasePageData } from './page.loader';

export type ExchangeRateCasePagePermissions = {
  canManage: boolean;
};

export function deriveExchangeRateCasePagePermissions(
  identity: ExchangeRateCasePageData[`identity`],
): ExchangeRateCasePagePermissions {
  const canManage = identity?.capabilities.includes(`exchange.manage`) ?? false;
  return { canManage };
}
