import { z } from 'zod';

import { adminV2ExpectedDeletedAtNullBodySchema } from './common';

export const ADMIN_V2_SAVED_VIEW_WORKSPACES = [`ledger_anomalies`, `verification_queue`] as const;
export type AdminV2SavedViewWorkspace = (typeof ADMIN_V2_SAVED_VIEW_WORKSPACES)[number];

export const ADMIN_V2_MIN_SAVED_VIEW_NAME_LENGTH = 1;
export const ADMIN_V2_MAX_SAVED_VIEW_NAME_LENGTH = 100;
export const ADMIN_V2_MAX_SAVED_VIEW_DESCRIPTION_LENGTH = 500;
export const ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES = 4096;

export type AdminV2SavedViewSummary = {
  id: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AdminV2SavedViewsListResponse = {
  views: AdminV2SavedViewSummary[];
};

export type AdminV2SavedViewListQuery = {
  workspace: AdminV2SavedViewWorkspace;
};

export type AdminV2SavedViewCreateBody = {
  workspace: AdminV2SavedViewWorkspace;
  name: string;
  description?: string | null;
  queryPayload: unknown;
};

export type AdminV2SavedViewUpdateBody = {
  name?: string;
  description?: string | null;
  queryPayload?: unknown;
  expectedDeletedAtNull: number;
};

export type AdminV2SavedViewDeleteBody = {
  expectedDeletedAtNull: number;
};

export function isAdminV2SavedViewWorkspace(value: string): value is AdminV2SavedViewWorkspace {
  return (ADMIN_V2_SAVED_VIEW_WORKSPACES as readonly string[]).includes(value);
}

export function getAdminV2JsonPayloadBytes(raw: unknown): number {
  const serialized = JSON.stringify(raw);
  return serialized === undefined ? 0 : Buffer.byteLength(serialized, `utf8`);
}

export function isAdminV2ObjectArrayOrNullPayload(value: unknown): value is Record<string, unknown> | unknown[] | null {
  return value === null || (typeof value === `object` && value !== null);
}

export const adminV2SavedViewCreateBodySchema = z.object({
  workspace: z.enum(ADMIN_V2_SAVED_VIEW_WORKSPACES),
  name: z.string().trim().min(ADMIN_V2_MIN_SAVED_VIEW_NAME_LENGTH).max(ADMIN_V2_MAX_SAVED_VIEW_NAME_LENGTH),
  description: z.string().trim().max(ADMIN_V2_MAX_SAVED_VIEW_DESCRIPTION_LENGTH).optional().nullable(),
  queryPayload: z
    .unknown()
    .refine(isAdminV2ObjectArrayOrNullPayload, {
      message: `queryPayload must be object, array, or null`,
    })
    .refine((value) => getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES, {
      message: `queryPayload exceeds ${ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES} bytes`,
    }),
});

export const adminV2SavedViewUpdateBodySchema = adminV2ExpectedDeletedAtNullBodySchema.extend({
  name: z.string().trim().min(ADMIN_V2_MIN_SAVED_VIEW_NAME_LENGTH).max(ADMIN_V2_MAX_SAVED_VIEW_NAME_LENGTH).optional(),
  description: z.string().trim().max(ADMIN_V2_MAX_SAVED_VIEW_DESCRIPTION_LENGTH).optional().nullable(),
  queryPayload: z
    .unknown()
    .refine((value) => value === undefined || isAdminV2ObjectArrayOrNullPayload(value), {
      message: `queryPayload must be object, array, or null`,
    })
    .refine(
      (value) => value === undefined || getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES,
      {
        message: `queryPayload exceeds ${ADMIN_V2_MAX_SAVED_VIEW_PAYLOAD_BYTES} bytes`,
      },
    )
    .optional(),
});

export const adminV2SavedViewDeleteBodySchema = adminV2ExpectedDeletedAtNullBodySchema;
