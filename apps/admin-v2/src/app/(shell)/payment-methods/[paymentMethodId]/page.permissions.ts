import { type PaymentMethodCasePageData } from './page.loader';

export type PaymentMethodCasePagePermissions = {
  canManage: boolean;
};

export function derivePaymentMethodCasePagePermissions(
  identity: PaymentMethodCasePageData[`identity`],
): PaymentMethodCasePagePermissions {
  const canManage = identity?.capabilities.includes(`payment_methods.manage`) ?? false;
  return { canManage };
}
