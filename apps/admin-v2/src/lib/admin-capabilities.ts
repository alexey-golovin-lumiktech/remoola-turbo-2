export const ADMIN_CAPABILITIES = {
  adminsRead: `admins.read`,
  adminsManage: `admins.manage`,
  alertsManage: `alerts.manage`,
  consumersEmailResend: `consumers.email_resend`,
  consumersFlags: `consumers.flags`,
  consumersForceLogout: `consumers.force_logout`,
  consumersNotes: `consumers.notes`,
  consumersSuspend: `consumers.suspend`,
  documentsManage: `documents.manage`,
  exchangeManage: `exchange.manage`,
  paymentMethodsManage: `payment_methods.manage`,
  payoutsEscalate: `payouts.escalate`,
  savedViewsManage: `saved_views.manage`,
} as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[keyof typeof ADMIN_CAPABILITIES];

type CapabilityBearer = { capabilities: ReadonlyArray<string> } | null | undefined;

export function hasAdminCapability(identity: CapabilityBearer, capability: AdminCapability): boolean {
  return identity?.capabilities.includes(capability) ?? false;
}
