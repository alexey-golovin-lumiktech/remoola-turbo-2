import { Injectable, NotFoundException } from '@nestjs/common';

import {
  type QuickstartCardDTO,
  type QuickstartId,
  type QuickstartResolvedPresetDTO,
  type QuickstartSurface,
} from './admin-v2-quickstarts.dto';

type QuickstartCatalogEntry = QuickstartResolvedPresetDTO;

const QUICKSTART_CATALOG: readonly QuickstartCatalogEntry[] = [
  {
    id: `verification-missing-documents`,
    label: `Verification missing documents`,
    description: `Focus the verification queue on cases waiting for missing consumer documents.`,
    eyebrow: `Priority queue`,
    targetPath: `/verification`,
    surfaces: [`shell`, `overview`],
    filters: {
      missingDocuments: true,
    },
  },
  {
    id: `verification-missing-profile`,
    label: `Verification profile gaps`,
    description: `Focus the verification queue on consumers whose profile data is still incomplete.`,
    eyebrow: `Priority queue`,
    targetPath: `/verification`,
    surfaces: [`shell`, `overview`],
    filters: {
      missingProfileData: true,
    },
  },
  {
    id: `overdue-payments-sweep`,
    label: `Overdue payments sweep`,
    description: `Open overdue payment requests that likely need collections review.`,
    eyebrow: `Priority queue`,
    targetPath: `/payments`,
    surfaces: [`shell`, `overview`],
    filters: {
      overdue: true,
    },
  },
  {
    id: `payment-operations-review`,
    label: `Payment operations review`,
    description: `Jump straight into the manual review buckets for payment cases with derived follow-up reasons.`,
    eyebrow: `Queue-first`,
    targetPath: `/payments/operations`,
    surfaces: [`shell`, `overview`],
    filters: {},
  },
  {
    id: `ledger-anomalies-triage`,
    label: `Ledger anomalies triage`,
    description: `Open the anomaly workspace to work the live discrepancy backlog before drilling into entries.`,
    eyebrow: `Case-first`,
    targetPath: `/ledger/anomalies`,
    surfaces: [`shell`, `overview`],
    filters: {},
  },
  {
    id: `documents-intake-review`,
    label: `Documents intake review`,
    description: `Open the evidence workspace for document tagging, linkage review, and intake cleanup.`,
    eyebrow: `Queue-first`,
    targetPath: `/documents`,
    surfaces: [`shell`, `overview`],
    filters: {},
  },
  {
    id: `exchange-scheduled-review`,
    label: `Scheduled FX review`,
    description: `Inspect scheduled conversions, retries, and linked ledger outcomes without detouring through overview.`,
    eyebrow: `Queue-first`,
    targetPath: `/exchange/scheduled`,
    surfaces: [`shell`, `overview`],
    filters: {},
  },
  {
    id: `admins-access-review`,
    label: `Admin access review`,
    description: `Go directly to the admin directory to review invitations, access posture, and role assignments.`,
    eyebrow: `Case-first`,
    targetPath: `/admins`,
    surfaces: [`shell`, `overview`],
    filters: {},
  },
  {
    id: `force-logout-audit-trail`,
    label: `Force logout audit trail`,
    description: `Review consumer force logout activity from the admin action log.`,
    eyebrow: `Audit trail`,
    targetPath: `/audit/admin-actions`,
    surfaces: [`shell`, `overview`],
    filters: {
      action: `consumer_force_logout`,
    },
  },
  {
    id: `system-alerts-console`,
    label: `System alerts console`,
    description: `Open operational alerts directly when you need to edit thresholds instead of reading the summary cards.`,
    eyebrow: `Queue-first`,
    targetPath: `/system/alerts`,
    surfaces: [`shell`, `overview`],
    requiredCapabilities: [`alerts.manage`],
    filters: {},
  },
] as const;

@Injectable()
export class AdminV2QuickstartsService {
  list(surface: QuickstartSurface = `all`): QuickstartCardDTO[] {
    return QUICKSTART_CATALOG.filter((entry) => surface === `all` || entry.surfaces.includes(surface)).map((entry) => ({
      id: entry.id,
      label: entry.label,
      description: entry.description,
      eyebrow: entry.eyebrow,
      targetPath: entry.targetPath,
      surfaces: [...entry.surfaces],
      ...(entry.requiredCapabilities ? { requiredCapabilities: [...entry.requiredCapabilities] } : {}),
    }));
  }

  get(quickstartId: QuickstartId): QuickstartResolvedPresetDTO {
    const match = QUICKSTART_CATALOG.find((entry) => entry.id === quickstartId);
    if (!match) {
      throw new NotFoundException(`Unknown admin-v2 quickstart`);
    }
    return {
      ...match,
      filters: { ...match.filters },
      surfaces: [...match.surfaces],
      ...(match.requiredCapabilities ? { requiredCapabilities: [...match.requiredCapabilities] } : {}),
    } as QuickstartResolvedPresetDTO;
  }
}
