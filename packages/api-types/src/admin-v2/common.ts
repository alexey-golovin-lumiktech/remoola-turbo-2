import { z } from 'zod';

export type AdminV2IsoDateTime = string;
export type AdminV2DecimalString = string;
export type AdminV2Uuid = string;

export type AdminV2PageInfo = {
  nextCursor: string | null;
};

export type AdminV2PaginatedOffsetResponse<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2CursorListResponse<TItem> = {
  items: TItem[];
  pageInfo: AdminV2PageInfo;
};

export type AdminV2MutationError = {
  code: string;
  message: string;
};

export type AdminV2VersionedMutationBody = {
  version: number;
};

export type AdminV2StepUpVersionedMutationBody = AdminV2VersionedMutationBody & {
  passwordConfirmation: string;
};

export type AdminV2ConfirmedMutationBody = {
  confirmed: boolean;
};

export type AdminV2ConfirmedVersionedMutationBody = AdminV2VersionedMutationBody & AdminV2ConfirmedMutationBody;
export type AdminV2StepUpConfirmedVersionedMutationBody = AdminV2StepUpVersionedMutationBody &
  AdminV2ConfirmedVersionedMutationBody;

export type AdminV2ExpectedDeletedAtNullBody = {
  expectedDeletedAtNull: number;
};

export type AdminV2ReasonBody = {
  reason?: string | null;
};

export const adminV2VersionedMutationBodySchema = z.object({
  version: z.number().int().positive(),
});

export const adminV2StepUpVersionedMutationBodySchema = adminV2VersionedMutationBodySchema.extend({
  passwordConfirmation: z.string().min(1).max(256),
});

export const adminV2ConfirmedMutationBodySchema = z.object({
  confirmed: z.boolean(),
});

export const adminV2ConfirmedVersionedMutationBodySchema = adminV2VersionedMutationBodySchema.extend({
  confirmed: z.boolean(),
});

export const adminV2StepUpConfirmedVersionedMutationBodySchema = adminV2StepUpVersionedMutationBodySchema.extend({
  confirmed: z.boolean(),
});

export const adminV2ExpectedDeletedAtNullBodySchema = z.object({
  expectedDeletedAtNull: z.literal(0),
});

const adminV2OptionalReasonSchema = z.object({
  reason: z.string().trim().optional().nullable(),
});
