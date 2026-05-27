import { z } from 'zod';

export type AdminV2CursorQuery = {
  cursor?: string;
  limit?: number;
};

export type AdminV2PageQuery = {
  page?: number;
  pageSize?: number;
};

export type AdminV2DateRangeQuery = {
  dateFrom?: string;
  dateTo?: string;
};

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

export const adminV2CursorQuerySchema = z.object({
  cursor: optionalTrimmedStringSchema,
  limit: optionalLimitSchema,
});

export const adminV2PageQuerySchema = z.object({
  page: optionalPageSchema,
  pageSize: optionalPageSchema,
});

export const adminV2DateRangeQuerySchema = z.object({
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
});

export type AdminV2PaymentsListQuery = AdminV2CursorQuery & {
  q?: string;
  status?: string;
  paymentRail?: string;
  currencyCode?: string;
  amountMin?: number;
  amountMax?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  overdue?: boolean;
};

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
}) satisfies z.ZodType<AdminV2PaymentsListQuery>;

export type AdminV2DocumentsListQuery = AdminV2PageQuery & {
  q?: string;
  consumerId?: string;
  access?: string;
  mimetype?: string;
  sizeMin?: number;
  sizeMax?: number;
  createdFrom?: string;
  createdTo?: string;
  paymentRequestId?: string;
  tag?: string;
  tagId?: string;
  includeDeleted?: boolean;
};

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
}) satisfies z.ZodType<AdminV2DocumentsListQuery>;

export type AdminV2PaymentMethodsListQuery = AdminV2PageQuery & {
  consumerId?: string;
  type?: string;
  defaultSelected?: boolean;
  fingerprint?: string;
  includeDeleted?: boolean;
};

export const adminV2PaymentMethodsListQuerySchema = adminV2PageQuerySchema.extend({
  consumerId: optionalTrimmedStringSchema,
  type: optionalTrimmedStringSchema,
  defaultSelected: optionalBooleanSchema,
  fingerprint: optionalTrimmedStringSchema,
  includeDeleted: optionalBooleanSchema,
}) satisfies z.ZodType<AdminV2PaymentMethodsListQuery>;

export type AdminV2ExchangeRatesListQuery = AdminV2PageQuery & {
  fromCurrency?: string;
  toCurrency?: string;
  provider?: string;
  status?: string;
  stale?: boolean;
};

export const adminV2ExchangeRatesListQuerySchema = adminV2PageQuerySchema.extend({
  fromCurrency: optionalTrimmedStringSchema,
  toCurrency: optionalTrimmedStringSchema,
  provider: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
  stale: optionalBooleanSchema,
}) satisfies z.ZodType<AdminV2ExchangeRatesListQuery>;

export type AdminV2ExchangeRulesListQuery = AdminV2PageQuery & {
  q?: string;
  enabled?: boolean;
  fromCurrency?: string;
  toCurrency?: string;
};

export const adminV2ExchangeRulesListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  enabled: optionalBooleanSchema,
  fromCurrency: optionalTrimmedStringSchema,
  toCurrency: optionalTrimmedStringSchema,
}) satisfies z.ZodType<AdminV2ExchangeRulesListQuery>;

export type AdminV2ExchangeScheduledListQuery = AdminV2PageQuery & {
  q?: string;
  status?: string;
};

export const adminV2ExchangeScheduledListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
}) satisfies z.ZodType<AdminV2ExchangeScheduledListQuery>;

export type AdminV2PayoutsListQuery = AdminV2CursorQuery;

export const adminV2PayoutsListQuerySchema = adminV2CursorQuerySchema satisfies z.ZodType<AdminV2PayoutsListQuery>;

export type AdminV2ConsumersListQuery = AdminV2PageQuery & {
  q?: string;
  accountType?: string;
  contractorKind?: string;
  verificationStatus?: string;
  includeDeleted?: boolean;
};

export const adminV2ConsumersListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  accountType: optionalTrimmedStringSchema,
  contractorKind: optionalTrimmedStringSchema,
  verificationStatus: optionalTrimmedStringSchema,
  includeDeleted: optionalBooleanSchema,
}) satisfies z.ZodType<AdminV2ConsumersListQuery>;

export type AdminV2VerificationQueuePayload = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
};

export const adminV2VerificationQueuePayloadSchema = z
  .object({
    status: optionalTrimmedStringSchema,
    stripeIdentityStatus: optionalTrimmedStringSchema,
    country: optionalTrimmedStringSchema,
    contractorKind: optionalTrimmedStringSchema,
    missingProfileData: optionalBooleanSchema,
    missingDocuments: optionalBooleanSchema,
  })
  .strict() satisfies z.ZodType<AdminV2VerificationQueuePayload>;

export type AdminV2VerificationQueueQuery = AdminV2PageQuery & {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
};

export const adminV2VerificationQueueQuerySchema = adminV2PageQuerySchema.extend({
  status: optionalTrimmedStringSchema,
  stripeIdentityStatus: optionalTrimmedStringSchema,
  country: optionalTrimmedStringSchema,
  contractorKind: optionalTrimmedStringSchema,
  missingProfileData: optionalBooleanSchema,
  missingDocuments: optionalBooleanSchema,
}) satisfies z.ZodType<AdminV2VerificationQueueQuery>;

export type AdminV2AuthRefreshReuseAlertQueryPayload = {
  windowMinutes: number;
};

export const adminV2AuthRefreshReuseAlertQueryPayloadSchema = z
  .object({
    windowMinutes: z
      .number()
      .int()
      .min(ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES)
      .max(ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES),
  })
  .strict() satisfies z.ZodType<AdminV2AuthRefreshReuseAlertQueryPayload>;

export type AdminV2ConsumerContractsQuery = AdminV2PageQuery & {
  role?: string;
  status?: string;
};

export const adminV2ConsumerContractsQuerySchema = adminV2PageQuerySchema.extend({
  role: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
}) satisfies z.ZodType<AdminV2ConsumerContractsQuery>;

export type AdminV2LedgerEntriesListQuery = AdminV2CursorQuery & {
  q?: string;
  type?: string;
  status?: string;
  currencyCode?: string;
  paymentRequestId?: string;
  consumerId?: string;
  amountSign?: string;
  dateFrom?: string;
  dateTo?: string;
};

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
}) satisfies z.ZodType<AdminV2LedgerEntriesListQuery>;

export type AdminV2LedgerDisputesQuery = AdminV2CursorQuery & {
  paymentRequestId?: string;
  consumerId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const adminV2LedgerDisputesQuerySchema = adminV2CursorQuerySchema.extend({
  paymentRequestId: optionalTrimmedStringSchema,
  consumerId: optionalTrimmedStringSchema,
  q: optionalTrimmedStringSchema,
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
}) satisfies z.ZodType<AdminV2LedgerDisputesQuery>;

export type AdminV2LedgerAnomaliesListQuery = AdminV2CursorQuery &
  Omit<AdminV2DateRangeQuery, `dateFrom`> & {
    class: string;
    dateFrom: string;
  };

export const adminV2LedgerAnomaliesListQuerySchema = adminV2CursorQuerySchema.extend({
  class: z.string().trim().min(1),
  dateFrom: z.string().refine(isIsoDateOnly, { message: `Expected YYYY-MM-DD` }),
  dateTo: optionalDateOnlySchema,
}) satisfies z.ZodType<AdminV2LedgerAnomaliesListQuery>;

export type AdminV2TimelineQuery = AdminV2PageQuery &
  AdminV2DateRangeQuery & {
    event?: string;
    action?: string;
  };

export const adminV2TimelineQuerySchema = adminV2PageQuerySchema.extend({
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
  event: optionalTrimmedStringSchema,
  action: optionalTrimmedStringSchema,
}) satisfies z.ZodType<AdminV2TimelineQuery>;

export type AdminV2AuditListQuery = AdminV2PageQuery &
  AdminV2DateRangeQuery & {
    event?: string;
    action?: string;
    adminId?: string;
    email?: string;
    ipAddress?: string;
    resourceId?: string;
  };

export const adminV2AuditListQuerySchema = adminV2PageQuerySchema.extend({
  dateFrom: optionalDateOnlySchema,
  dateTo: optionalDateOnlySchema,
  event: optionalTrimmedStringSchema,
  action: optionalTrimmedStringSchema,
  adminId: optionalTrimmedStringSchema,
  email: optionalTrimmedStringSchema,
  ipAddress: optionalTrimmedStringSchema,
  resourceId: optionalTrimmedStringSchema,
}) satisfies z.ZodType<AdminV2AuditListQuery>;

export type AdminV2AdminsListQuery = AdminV2PageQuery & {
  q?: string;
  status?: string;
};

export const adminV2AdminsListQuerySchema = adminV2PageQuerySchema.extend({
  q: optionalTrimmedStringSchema,
  status: optionalTrimmedStringSchema,
}) satisfies z.ZodType<AdminV2AdminsListQuery>;
