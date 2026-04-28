import { z } from 'zod';

import { adminV2ExpectedDeletedAtNullBodySchema } from './common';
import { getAdminV2JsonPayloadBytes, isAdminV2ObjectArrayOrNullPayload } from './saved-views';

export const ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES = [
  `ledger_anomalies`,
  `verification_queue`,
  `auth_refresh_reuse`,
] as const;
export type AdminV2OperationalAlertWorkspace = (typeof ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES)[number];

export const ADMIN_V2_MIN_OPERATIONAL_ALERT_NAME_LENGTH = 1;
export const ADMIN_V2_MAX_OPERATIONAL_ALERT_NAME_LENGTH = 100;
export const ADMIN_V2_MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH = 500;
export const ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES = 4096;
export const ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES = 1024;
export const ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1;
export const ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1440;
export const ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES = 5;

export const ADMIN_V2_SUPPORTED_THRESHOLD_TYPES = [`count_gt`] as const;
export type AdminV2SupportedThresholdType = (typeof ADMIN_V2_SUPPORTED_THRESHOLD_TYPES)[number];

export type AdminV2CountGtThreshold = {
  type: `count_gt`;
  value: number;
};

export type AdminV2OperationalAlertThreshold = AdminV2CountGtThreshold;

export const ADMIN_V2_MIN_COUNT_GT_VALUE = 1;
export const ADMIN_V2_MAX_COUNT_GT_VALUE = 1_000_000;

export type AdminV2OperationalAlertSummary = {
  id: string;
  workspace: AdminV2OperationalAlertWorkspace;
  name: string;
  description: string | null;
  queryPayload: unknown;
  thresholdPayload: AdminV2OperationalAlertThreshold;
  evaluationIntervalMinutes: number;
  lastEvaluatedAt: string | null;
  lastEvaluationError: string | null;
  lastFiredAt: string | null;
  lastFireReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminV2OperationalAlertsListResponse = {
  alerts: AdminV2OperationalAlertSummary[];
};

export type AdminV2OperationalAlertListQuery = {
  workspace: AdminV2OperationalAlertWorkspace;
};

export type AdminV2OperationalAlertCreateBody = {
  workspace: AdminV2OperationalAlertWorkspace;
  name: string;
  description?: string | null;
  queryPayload: unknown;
  thresholdPayload: unknown;
  evaluationIntervalMinutes?: number | null;
};

export type AdminV2OperationalAlertUpdateBody = {
  name?: string;
  description?: string | null;
  queryPayload?: unknown;
  thresholdPayload?: unknown;
  evaluationIntervalMinutes?: number | null;
  expectedDeletedAtNull: number;
};

export type AdminV2OperationalAlertDeleteBody = {
  expectedDeletedAtNull: number;
};

export function isAdminV2OperationalAlertWorkspace(value: string): value is AdminV2OperationalAlertWorkspace {
  return (ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES as readonly string[]).includes(value);
}

export const adminV2OperationalAlertThresholdSchema = z.object({
  type: z.literal(`count_gt`),
  value: z.number().int().min(ADMIN_V2_MIN_COUNT_GT_VALUE).max(ADMIN_V2_MAX_COUNT_GT_VALUE),
}) satisfies z.ZodType<AdminV2OperationalAlertThreshold>;

const adminV2OperationalAlertBaseBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(ADMIN_V2_MIN_OPERATIONAL_ALERT_NAME_LENGTH)
    .max(ADMIN_V2_MAX_OPERATIONAL_ALERT_NAME_LENGTH),
  description: z.string().trim().max(ADMIN_V2_MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH).optional().nullable(),
  queryPayload: z
    .unknown()
    .refine(isAdminV2ObjectArrayOrNullPayload, {
      message: `queryPayload must be object, array, or null`,
    })
    .refine((value) => getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES, {
      message: `queryPayload exceeds ${ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES} bytes`,
    }),
  thresholdPayload: adminV2OperationalAlertThresholdSchema.refine(
    (value) => getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES,
    {
      message: `thresholdPayload exceeds ${ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES} bytes`,
    },
  ),
  evaluationIntervalMinutes: z
    .number()
    .int()
    .min(ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES)
    .max(ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES)
    .optional()
    .nullable(),
});

export const adminV2OperationalAlertCreateBodySchema = adminV2OperationalAlertBaseBodySchema.extend({
  workspace: z.enum(ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES),
});

export const adminV2OperationalAlertUpdateBodySchema = adminV2ExpectedDeletedAtNullBodySchema.extend({
  name: adminV2OperationalAlertBaseBodySchema.shape.name.optional(),
  description: adminV2OperationalAlertBaseBodySchema.shape.description,
  queryPayload: z
    .unknown()
    .refine((value) => value === undefined || isAdminV2ObjectArrayOrNullPayload(value), {
      message: `queryPayload must be object, array, or null`,
    })
    .refine(
      (value) =>
        value === undefined || getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES,
      {
        message: `queryPayload exceeds ${ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES} bytes`,
      },
    )
    .optional(),
  thresholdPayload: adminV2OperationalAlertThresholdSchema
    .refine((value) => getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES, {
      message: `thresholdPayload exceeds ${ADMIN_V2_MAX_OPERATIONAL_ALERT_THRESHOLD_PAYLOAD_BYTES} bytes`,
    })
    .optional(),
  evaluationIntervalMinutes: adminV2OperationalAlertBaseBodySchema.shape.evaluationIntervalMinutes,
});

export const adminV2OperationalAlertDeleteBodySchema = adminV2ExpectedDeletedAtNullBodySchema;
