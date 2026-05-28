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

export const adminV2OperationalAlertSummaryWorkspaceSchema = z.enum(ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES);

export const ADMIN_V2_SUPPORTED_THRESHOLD_TYPES = [`count_gt`] as const;
export type AdminV2SupportedThresholdType = (typeof ADMIN_V2_SUPPORTED_THRESHOLD_TYPES)[number];

export const ADMIN_V2_MIN_COUNT_GT_VALUE = 1;
export const ADMIN_V2_MAX_COUNT_GT_VALUE = 1_000_000;

export type AdminV2OperationalAlertListQuery = {
  workspace: AdminV2OperationalAlertWorkspace;
};

export function isAdminV2OperationalAlertWorkspace(value: string): value is AdminV2OperationalAlertWorkspace {
  return (ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES as readonly string[]).includes(value);
}

export const adminV2OperationalAlertThresholdSchema = z.object({
  type: z.literal(`count_gt`),
  value: z.number().int().min(ADMIN_V2_MIN_COUNT_GT_VALUE).max(ADMIN_V2_MAX_COUNT_GT_VALUE),
});

export const adminV2OperationalAlertThresholdQueryPayloadSchema = z
  .unknown()
  .refine(isAdminV2ObjectArrayOrNullPayload, {
    message: `queryPayload must be object, array, or null`,
  })
  .refine((value) => getAdminV2JsonPayloadBytes(value) <= ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES, {
    message: `queryPayload exceeds ${ADMIN_V2_MAX_OPERATIONAL_ALERT_QUERY_PAYLOAD_BYTES} bytes`,
  });

const adminV2OperationalAlertBaseBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(ADMIN_V2_MIN_OPERATIONAL_ALERT_NAME_LENGTH)
    .max(ADMIN_V2_MAX_OPERATIONAL_ALERT_NAME_LENGTH),
  description: z.string().trim().max(ADMIN_V2_MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH).optional().nullable(),
  queryPayload: adminV2OperationalAlertThresholdQueryPayloadSchema,
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
  workspace: adminV2OperationalAlertSummaryWorkspaceSchema,
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
export type AdminV2OperationalAlertCreateBody = z.infer<typeof adminV2OperationalAlertCreateBodySchema>;
export type AdminV2OperationalAlertUpdateBody = z.infer<typeof adminV2OperationalAlertUpdateBodySchema>;
export type AdminV2OperationalAlertDeleteBody = z.infer<typeof adminV2OperationalAlertDeleteBodySchema>;
export type AdminV2OperationalAlertThreshold = z.infer<typeof adminV2OperationalAlertThresholdSchema>;
export type AdminV2OperationalAlertThresholdQueryPayload = z.infer<
  typeof adminV2OperationalAlertThresholdQueryPayloadSchema
>;
