import { z } from 'zod';

export type ApiErrorShape = {
  message: string;
  code?: string;
  details?: unknown;
};

/** Zod schema for parsing API error responses. Use in both consumer and admin apps. */
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiResponseShape<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiErrorShape };
