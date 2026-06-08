import { BadRequestException } from '@nestjs/common';

import { type AdminV2SavedViewSummary } from '@remoola/api-types';
import { type Prisma } from '@remoola/database-2';

import {
  MAX_SAVED_VIEW_DESCRIPTION_LENGTH,
  MAX_SAVED_VIEW_NAME_LENGTH,
  MIN_SAVED_VIEW_NAME_LENGTH,
} from './admin-v2-saved-views.dto';

export type SavedViewSummary = AdminV2SavedViewSummary;

export type SavedViewRow = {
  id: string;
  ownerId: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type UpdatePresence = {
  hasName: boolean;
  hasDescription: boolean;
  hasPayload: boolean;
};

export function toSummary(row: SavedViewRow): SavedViewSummary {
  return {
    id: row.id,
    workspace: row.workspace,
    name: row.name,
    description: row.description,
    queryPayload: row.queryPayload as unknown,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function trimRequiredName(raw: string | null | undefined): string {
  const trimmed = (raw ?? ``).trim();
  if (trimmed.length < MIN_SAVED_VIEW_NAME_LENGTH) {
    throw new BadRequestException(`name is required`);
  }
  if (trimmed.length > MAX_SAVED_VIEW_NAME_LENGTH) {
    throw new BadRequestException(`name is too long (max ${MAX_SAVED_VIEW_NAME_LENGTH} characters)`);
  }
  return trimmed;
}

export function normalizeDescription(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_SAVED_VIEW_DESCRIPTION_LENGTH) {
    throw new BadRequestException(`description is too long (max ${MAX_SAVED_VIEW_DESCRIPTION_LENGTH} characters)`);
  }
  return trimmed;
}

export function assertExpectedDeletedAtNull(value: number) {
  if (value !== 0) {
    throw new BadRequestException(`expectedDeletedAtNull must be 0`);
  }
}

export function buildChangedFields(params: UpdatePresence): string[] {
  return [
    ...(params.hasName ? [`name`] : []),
    ...(params.hasDescription ? [`description`] : []),
    ...(params.hasPayload ? [`queryPayload`] : []),
  ];
}

export function buildCreateAuditMetadata(params: { workspace: string; name: string; payloadBytes: number }) {
  return {
    workspace: params.workspace,
    name: params.name,
    payloadBytes: params.payloadBytes,
    severity: `standard` as const,
  };
}

export function buildUpdateAuditMetadata(
  params: UpdatePresence & {
    workspace: string;
    previousName: string;
    nextName?: string;
    payloadBytes: number | null;
  },
) {
  return {
    workspace: params.workspace,
    changedFields: buildChangedFields(params),
    ...(params.hasName && params.nextName !== params.previousName ? { previousName: params.previousName } : {}),
    ...(params.payloadBytes !== null ? { payloadBytes: params.payloadBytes } : {}),
    severity: `standard` as const,
  };
}

export function buildDeleteAuditMetadata(params: { workspace: string; name: string }) {
  return {
    workspace: params.workspace,
    name: params.name,
    severity: `standard` as const,
  };
}
