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
    } as QuickstartResolvedPresetDTO;
  }
}
