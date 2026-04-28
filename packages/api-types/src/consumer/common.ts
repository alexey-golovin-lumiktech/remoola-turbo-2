import { z } from 'zod';

export type ConsumerIsoDateTime = string;
export type ConsumerDateOnly = string;
export type ConsumerDecimalString = string;
export type ConsumerUuid = string;

export type ConsumerPageQuery = {
  page?: number;
  pageSize?: number;
};

export type ConsumerOffsetQuery = {
  limit?: number;
  offset?: number;
};

export type ConsumerPaginatedOffsetResponse<TItem> = {
  items: TItem[];
  total: number;
  page?: number;
  pageSize?: number;
};

export type ConsumerPaginatedLimitOffsetResponse<TItem> = {
  items: TItem[];
  total: number;
  limit?: number;
  offset?: number;
};

export type ConsumerMutationError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export type ConsumerMutationResult = {
  ok: true;
  message?: string;
};

export type ConsumerFailedMutationResult = {
  ok: false;
  error: ConsumerMutationError;
};

export const consumerPageQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export const consumerOffsetQuerySchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});
