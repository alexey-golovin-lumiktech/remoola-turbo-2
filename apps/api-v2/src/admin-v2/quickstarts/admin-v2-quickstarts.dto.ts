export const QUICKSTART_IDS = [
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

export const QUICKSTART_SURFACES = [`shell`, `overview`, `all`] as const;
export const QUICKSTART_TARGET_ROUTES = [
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

export type QuickstartId = (typeof QUICKSTART_IDS)[number];
export type QuickstartSurface = (typeof QUICKSTART_SURFACES)[number];
export type QuickstartTargetRoute = (typeof QUICKSTART_TARGET_ROUTES)[number];

export type VerificationQuickstartFilters = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: true;
  missingDocuments?: true;
};

export type PaymentsQuickstartFilters = {
  status?: string;
  paymentRail?: string;
  currencyCode?: string;
  overdue?: true;
};

export type AuditAdminActionsQuickstartFilters = {
  action?: string;
  adminId?: string;
  email?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type QuickstartCardDTO = {
  id: QuickstartId;
  label: string;
  description: string;
  eyebrow: string;
  targetPath: QuickstartTargetRoute;
  surfaces: Array<Exclude<QuickstartSurface, `all`>>;
  requiredCapabilities?: string[];
};

export type QuickstartResolvedPresetDTO =
  | (QuickstartCardDTO & {
      targetPath: `/verification`;
      filters: VerificationQuickstartFilters;
    })
  | (QuickstartCardDTO & {
      targetPath: `/payments`;
      filters: PaymentsQuickstartFilters;
    })
  | (QuickstartCardDTO & {
      targetPath: `/audit/admin-actions`;
      filters: AuditAdminActionsQuickstartFilters;
    })
  | (QuickstartCardDTO & {
      targetPath:
        | `/payments/operations`
        | `/ledger/anomalies`
        | `/documents`
        | `/exchange/scheduled`
        | `/admins`
        | `/system/alerts`;
      filters: Record<string, never>;
    });

export function isQuickstartId(value: string): value is QuickstartId {
  return (QUICKSTART_IDS as readonly string[]).includes(value);
}

export function isQuickstartSurface(value: string): value is QuickstartSurface {
  return (QUICKSTART_SURFACES as readonly string[]).includes(value);
}
