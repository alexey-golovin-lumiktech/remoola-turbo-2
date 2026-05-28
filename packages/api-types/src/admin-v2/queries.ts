import { z } from 'zod';

export const ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES = 1;

export const ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES = 1440;

export const ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES = 15;

function isIsoDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

const optionalTrimmedStringSchema = z.string().trim().min(1).optional();
const optionalPageSchema = z.number().int().min(1).optional();
const optionalLimitSchema = z.number().int().min(1).optional();
const optionalFiniteNumberSchema = z.number().finite().optional();
const optionalBooleanSchema = z.boolean().optional();
const optionalDateOnlySchema = z.string().refine(isIsoDateOnly, { message: `Expected YYYY-MM-DD` }).optional();
const adminV2CursorQuerySchema = z.object({
  cursor: optionalTrimmedStringSchema,
  limit: optionalLimitSchema,
});
const adminV2PageQuerySchema = z.object({
  page: optionalPageSchema,
  pageSize: optionalPageSchema,
});
export const adminV2PaymentsListQuerySchema = adminV2CursorQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
  paymentRail: optionalTrimmedStringSchema,
  currencyCode: optionalTrimmedStringSchema,
  amountMin: optionalFiniteNumberSchema,
  amountMax: optionalFiniteNumberSchema,
  dueDateFrom: optionalDateOnlySchema,
  dueDateTo: optionalDateOnlySchema,
  createdFrom: optionalDateOnlySchema,
  createdTo: optionalDateOnlySchema,
  overdue: optionalBooleanSchema,
});
export const adminV2DocumentsListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  consumerId: optionalTrimmedStringSchema,
  access: optionalTrimmedStringSchema,
  mimetype: optionalTrimmedStringSchema,
  sizeMin: optionalFiniteNumberSchema,
  sizeMax: optionalFiniteNumberSchema,
  createdFrom: optionalDateOnlySchema,
  createdTo: optionalDateOnlySchema,
  paymentRequestId: optionalTrimmedStringSchema,
  tag: optionalTrimmedStringSchema,
  tagId: optionalTrimmedStringSchema,
  includeDeleted: optionalBooleanSchema,
});

export const adminV2PaymentMethodsListQuerySchema = adminV2PageQuerySchema.extend({
  consumerId: optionalTrimmedStringSchema,
  type: optionalTrimmedStringSchema,
  defaultSelected: optionalBooleanSchema,
  fingerprint: optionalTrimmedStringSchema,
  includeDeleted: optionalBooleanSchema,
});
export const adminV2ExchangeRatesListQuerySchema = adminV2PageQuerySchema.extend({
  fromCurrency: optionalTrimmedStringSchema,
  toCurrency: optionalTrimmedStringSchema,
  provider: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
  stale: optionalBooleanSchema,
});
export const adminV2ExchangeRulesListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  enabled: optionalBooleanSchema,
  fromCurrency: optionalTrimmedStringSchema,
  toCurrency: optionalTrimmedStringSchema,
});
export const adminV2ExchangeScheduledListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
});
export const adminV2PayoutsListQuerySchema = adminV2CursorQuerySchema;

export const adminV2ConsumersListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  accountType: optionalTrimmedStringSchema,
  contractorKind: optionalTrimmedStringSchema,
  verificationStatus: optionalTrimmedStringSchema,
  includeDeleted: optionalBooleanSchema,
});
export const adminV2VerificationQueuePayloadSchema = z
  .object({
    status: optionalTrimmedStringSchema,
    stripeIdentityStatus: optionalTrimmedStringSchema,
    country: optionalTrimmedStringSchema,
    contractorKind: optionalTrimmedStringSchema,
    missingProfileData: optionalBooleanSchema,
    missingDocuments: optionalBooleanSchema,
  })
  .strict();
export const adminV2VerificationQueueQuerySchema = adminV2PageQuerySchema.extend({
  status: optionalTrimmedStringSchema,
  stripeIdentityStatus: optionalTrimmedStringSchema,
  country: optionalTrimmedStringSchema,
  contractorKind: optionalTrimmedStringSchema,
  missingProfileData: optionalBooleanSchema,
  missingDocuments: optionalBooleanSchema,
});
export const adminV2AuthRefreshReuseAlertQueryPayloadSchema = z
  .object({
    windowMinutes: z
      .number()
      .int()
      .min(ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES)
      .max(ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES),
  })
  .strict();

const adminV2ConsumerContractsQuerySchema = adminV2PageQuerySchema.extend({
  role: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
});
export const adminV2LedgerEntriesListQuerySchema = adminV2CursorQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  type: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
  currencyCode: optionalTrimmedStringSchema,
  paymentRequestId: optionalTrimmedStringSchema,
  consumerId: optionalTrimmedStringSchema,
  amountSign: optionalTrimmedStringSchema,
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
});
export const adminV2LedgerDisputesQuerySchema = adminV2CursorQuerySchema.extend({
  paymentRequestId: optionalTrimmedStringSchema,
  consumerId: optionalTrimmedStringSchema,
  q: optionalTrimmedStringSchema,
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
});
export const adminV2LedgerAnomaliesListQuerySchema = adminV2CursorQuerySchema.extend({
  class: z.string().trim().min(1),
  dateFrom: z.string().refine(isIsoDateOnly, { message: `Expected YYYY-MM-DD` }),
  dateTo: optionalDateOnlySchema,
});
const adminV2TimelineQuerySchema = adminV2PageQuerySchema.extend({
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
  event: optionalTrimmedStringSchema,
  action: optionalTrimmedStringSchema,
});

export const adminV2AuditListQuerySchema = adminV2PageQuerySchema.extend({
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
  event: optionalTrimmedStringSchema,
  action: optionalTrimmedStringSchema,
  adminId: optionalTrimmedStringSchema,
  email: optionalTrimmedStringSchema,
  ipAddress: optionalTrimmedStringSchema,
  resourceId: optionalTrimmedStringSchema,
});
export const adminV2AdminsListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
});

export type AdminV2CursorQuery = z.infer<typeof adminV2CursorQuerySchema>;
export type AdminV2PaymentsListQuery = z.infer<typeof adminV2PaymentsListQuerySchema>;
export type AdminV2DocumentsListQuery = z.infer<typeof adminV2DocumentsListQuerySchema>;
export type AdminV2PaymentMethodsListQuery = z.infer<typeof adminV2PaymentMethodsListQuerySchema>;
export type AdminV2ExchangeRatesListQuery = z.infer<typeof adminV2ExchangeRatesListQuerySchema>;
export type AdminV2ExchangeRulesListQuery = z.infer<typeof adminV2ExchangeRulesListQuerySchema>;
export type AdminV2ExchangeScheduledListQuery = z.infer<typeof adminV2ExchangeScheduledListQuerySchema>;
export type AdminV2PayoutsListQuery = z.infer<typeof adminV2PayoutsListQuerySchema>;
export type AdminV2ConsumersListQuery = z.infer<typeof adminV2ConsumersListQuerySchema>;
export type AdminV2VerificationQueuePayload = z.infer<typeof adminV2VerificationQueuePayloadSchema>;
export type AdminV2VerificationQueueQuery = z.infer<typeof adminV2VerificationQueueQuerySchema>;
export type AdminV2AuthRefreshReuseAlertQueryPayload = z.infer<typeof adminV2AuthRefreshReuseAlertQueryPayloadSchema>;
export type AdminV2ConsumerContractsQuery = z.infer<typeof adminV2ConsumerContractsQuerySchema>;
export type AdminV2LedgerEntriesListQuery = z.infer<typeof adminV2LedgerEntriesListQuerySchema>;
export type AdminV2LedgerDisputesQuery = z.infer<typeof adminV2LedgerDisputesQuerySchema>;
export type AdminV2LedgerAnomaliesListQuery = z.infer<typeof adminV2LedgerAnomaliesListQuerySchema>;
export type AdminV2TimelineQuery = z.infer<typeof adminV2TimelineQuerySchema>;
export type AdminV2AuditListQuery = z.infer<typeof adminV2AuditListQuerySchema>;
export type AdminV2AdminsListQuery = z.infer<typeof adminV2AdminsListQuerySchema>;
export type AdminV2PageQuery = { page?: number; pageSize?: number };
export type AdminV2DateRangeQuery = { dateFrom?: string; dateTo?: string };
