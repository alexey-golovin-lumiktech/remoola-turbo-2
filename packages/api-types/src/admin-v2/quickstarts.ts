export const ADMIN_V2_QUICKSTART_IDS = [
  `verification-missing-documents`,
  `verification-missing-profile`,
  `overdue-payments-sweep`,
  `payment-operations-review`,
  `ledger-anomalies-triage`,
  `documents-intake-review`,
  `exchange-scheduled-review`,
  `admins-access-review`,
  `force-logout-audit-trail`,
  `system-alerts-console`,
] as const;

export const ADMIN_V2_QUICKSTART_SURFACES = [`shell`, `overview`, `all`] as const;
export const ADMIN_V2_QUICKSTART_OPERATOR_MODELS = [`entry-only`, `saved-view-compatible`, `threshold-editor`] as const;
export const ADMIN_V2_QUICKSTART_TARGET_ROUTES = [
  `/verification`,
  `/payments`,
  `/payments/operations`,
  `/ledger/anomalies`,
  `/documents`,
  `/exchange/scheduled`,
  `/admins`,
  `/audit/admin-actions`,
  `/system/alerts`,
] as const;

export type AdminV2QuickstartId = (typeof ADMIN_V2_QUICKSTART_IDS)[number];
export type AdminV2QuickstartSurface = (typeof ADMIN_V2_QUICKSTART_SURFACES)[number];
export type AdminV2QuickstartOperatorModel = (typeof ADMIN_V2_QUICKSTART_OPERATOR_MODELS)[number];
export type AdminV2QuickstartTargetRoute = (typeof ADMIN_V2_QUICKSTART_TARGET_ROUTES)[number];

export type AdminV2VerificationQuickstartFilters = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: true;
  missingDocuments?: true;
};

export type AdminV2PaymentsQuickstartFilters = {
  status?: string;
  paymentRail?: string;
  currencyCode?: string;
  overdue?: true;
};

export type AdminV2AuditAdminActionsQuickstartFilters = {
  action?: string;
  adminId?: string;
  email?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AdminV2QuickstartCard = {
  id: AdminV2QuickstartId;
  label: string;
  description: string;
  eyebrow: string;
  operatorModel: AdminV2QuickstartOperatorModel;
  targetPath: AdminV2QuickstartTargetRoute;
  surfaces: Array<Exclude<AdminV2QuickstartSurface, `all`>>;
  requiredCapabilities?: string[];
};

export type AdminV2QuickstartResolvedPreset =
  | (AdminV2QuickstartCard & {
      targetPath: `/verification`;
      filters: AdminV2VerificationQuickstartFilters;
    })
  | (AdminV2QuickstartCard & {
      targetPath: `/payments`;
      filters: AdminV2PaymentsQuickstartFilters;
    })
  | (AdminV2QuickstartCard & {
      targetPath: `/audit/admin-actions`;
      filters: AdminV2AuditAdminActionsQuickstartFilters;
    })
  | (AdminV2QuickstartCard & {
      targetPath:
        | `/payments/operations`
        | `/ledger/anomalies`
        | `/documents`
        | `/exchange/scheduled`
        | `/admins`
        | `/system/alerts`;
      filters: Record<string, never>;
    });

export type AdminV2QuickstartsListQuery = {
  surface?: AdminV2QuickstartSurface;
};

export type AdminV2QuickstartsListResponse = {
  items: AdminV2QuickstartCard[];
};

export function isAdminV2QuickstartId(value: string): value is AdminV2QuickstartId {
  return (ADMIN_V2_QUICKSTART_IDS as readonly string[]).includes(value);
}

export function isAdminV2QuickstartSurface(value: string): value is AdminV2QuickstartSurface {
  return (ADMIN_V2_QUICKSTART_SURFACES as readonly string[]).includes(value);
}
