import { type QuickstartCard, type QuickstartId, type QuickstartTargetRoute } from './admin-api.server';

export type QuickstartInvestigation = QuickstartCard;
export type QuickstartWorkspace = `verification` | `payments` | `audit`;

const KNOWN_QUICKSTART_IDS: readonly QuickstartId[] = [
  `verification-missing-documents`,
  `overdue-payments-sweep`,
  `force-logout-audit-trail`,
] as const;

const QUICKSTART_TARGET_WORKSPACES: Readonly<Record<QuickstartTargetRoute, QuickstartWorkspace>> = {
  '/verification': `verification`,
  '/payments': `payments`,
  '/audit/admin-actions': `audit`,
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
  workspaces: readonly string[] | null | undefined,
): QuickstartCard[] {
  const allowedWorkspaces = new Set(workspaces ?? []);
  return quickstarts.filter((quickstart) => allowedWorkspaces.has(getQuickstartWorkspace(quickstart.targetPath)));
}

export function normalizeQuickstartEyebrow(eyebrow: string): string {
  const normalized = eyebrow.trim().toLowerCase();

  if (normalized.includes(`queue-first`)) return `Priority queue`;
  if (normalized.includes(`audit-first`)) return `Audit trail`;
  if (normalized.includes(`case-first`)) return `Case review`;
  if (normalized.includes(`derived artifact`)) return `Reference`;

  return eyebrow;
}

export function isQuickstartId(value: string): value is QuickstartId {
  return (KNOWN_QUICKSTART_IDS as readonly string[]).includes(value);
}

export function parseQuickstartId(value: string | null | undefined): QuickstartId | null {
  const candidate = value?.trim();
  return candidate && isQuickstartId(candidate) ? candidate : null;
}
