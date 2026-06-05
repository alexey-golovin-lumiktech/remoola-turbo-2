import { type PaymentMethodCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';

export type PaymentMethodCasePagePermissions = {
  canManage: boolean;
};

export function derivePaymentMethodCasePagePermissions(
  identity: PaymentMethodCasePageData[`identity`],
): PaymentMethodCasePagePermissions {
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.paymentMethodsManage);
  return { canManage };
}
