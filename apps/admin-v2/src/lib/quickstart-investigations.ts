import {
  type QuickstartCard,
  type QuickstartId,
  type QuickstartOperatorModel,
  type QuickstartTargetRoute,
} from './admin-api.server';

export type QuickstartInvestigation = QuickstartCard;
export type QuickstartWorkspace =
  | `verification`
  | `payments`
  | `ledger`
  | `documents`
  | `exchange`
  | `admins`
  | `audit`
  | `system`;

const KNOWN_QUICKSTART_IDS: readonly QuickstartId[] = [
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

const QUICKSTART_TARGET_WORKSPACES: Readonly<Record<QuickstartTargetRoute, QuickstartWorkspace>> = {
  '/verification': `verification`,
  '/payments': `payments`,
  '/payments/operations': `payments`,
  '/ledger/anomalies': `ledger`,
  '/documents': `documents`,
  '/exchange/scheduled': `exchange`,
  '/admins': `admins`,
  '/audit/admin-actions': `audit`,
  '/system/alerts': `system`,
};

export function buildQuickstartHref(targetPath: QuickstartTargetRoute, quickstartId: QuickstartId): string {
  const query = new URLSearchParams({ quickstart: quickstartId });
  return `${targetPath}?${query.toString()}`;
}

export function getQuickstartWorkspace(targetPath: QuickstartTargetRoute): QuickstartWorkspace {
  return QUICKSTART_TARGET_WORKSPACES[targetPath];
}

export function filterQuickstartsForWorkspaces(
  quickstarts: QuickstartCard[],
  identity: { workspaces?: readonly string[] | null; capabilities?: readonly string[] | null } | null | undefined,
): QuickstartCard[] {
  const allowedWorkspaces = new Set(identity?.workspaces ?? []);
  const allowedCapabilities = new Set(identity?.capabilities ?? []);
  return quickstarts.filter((quickstart) => {
    if (!allowedWorkspaces.has(getQuickstartWorkspace(quickstart.targetPath))) {
      return false;
    }
    if (!quickstart.requiredCapabilities?.length) {
      return true;
    }
    return quickstart.requiredCapabilities.every((capability) => allowedCapabilities.has(capability));
  });
}

export function normalizeQuickstartEyebrow(eyebrow: string): string {
  const normalized = eyebrow.trim().toLowerCase();

  if (normalized.includes(`queue-first`)) return `Priority queue`;
  if (normalized.includes(`audit-first`)) return `Audit trail`;
  if (normalized.includes(`case-first`)) return `Case review`;
  if (normalized.includes(`derived artifact`)) return `Reference`;

  return eyebrow;
}

export function describeQuickstartOperatorModel(operatorModel: QuickstartOperatorModel): string {
  if (operatorModel === `saved-view-compatible`) return `Durable preset available`;
  if (operatorModel === `threshold-editor`) return `Threshold editor`;
  return `Fast entry`;
}

export function isQuickstartId(value: string): value is QuickstartId {
  return (KNOWN_QUICKSTART_IDS as readonly string[]).includes(value);
}

export function parseQuickstartId(value: string | null | undefined): QuickstartId | null {
  const candidate = value?.trim();
  return candidate && isQuickstartId(candidate) ? candidate : null;
}
