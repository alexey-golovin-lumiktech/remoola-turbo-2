import { z } from 'zod';

export const conversionIdParamsSchema = z.object({
  conversionId: z.string().min(1, `Conversion ID is required`),
});

export const ruleIdParamsSchema = z.object({
  ruleId: z.string().min(1, `Rule ID is required`),
});

export const exchangeQuoteSchema = z.object({
  fromCurrency: z
    .string()
    .min(3, `Currency code must be at least 3 characters`)
    .max(3, `Currency code must be exactly 3 characters`)
    .toUpperCase(),
  toCurrency: z
    .string()
    .min(3, `Currency code must be at least 3 characters`)
    .max(3, `Currency code must be exactly 3 characters`)
    .toUpperCase(),
  amount: z.number().positive(`Amount must be greater than 0`).finite(`Amount must be a finite number`),
});

export const exchangeConversionSchema = z.object({
  fromCurrency: z
    .string()
    .min(3, `Currency code must be at least 3 characters`)
    .max(3, `Currency code must be exactly 3 characters`)
    .toUpperCase(),
  toCurrency: z
    .string()
    .min(3, `Currency code must be at least 3 characters`)
    .max(3, `Currency code must be exactly 3 characters`)
    .toUpperCase(),
  amount: z.number().positive(`Amount must be greater than 0`).finite(`Amount must be a finite number`),
});

export const createExchangeRuleSchema = z.object({
  name: z.string().min(1, `Rule name is required`).max(100, `Rule name must be less than 100 characters`),
  fromCurrency: z
    .string()
    .min(3, `Currency code must be at least 3 characters`)
    .max(3, `Currency code must be exactly 3 characters`)
    .toUpperCase(),
  toCurrency: z
    .string()
    .min(3, `Currency code must be at least 3 characters`)
    .max(3, `Currency code must be exactly 3 characters`)
    .toUpperCase(),
  enabled: z.boolean().default(true),
});

export const updateExchangeRuleSchema = z.object({
  ruleId: z.string().min(1, `Rule ID is required`),
  name: z.string().min(1, `Rule name is required`).max(100, `Rule name must be less than 100 characters`).optional(),
  enabled: z.boolean().optional(),
});

export function parseConversionIdParams(params: unknown): { conversionId: string } | { error: string } {
  const parsed = conversionIdParamsSchema.safeParse(params);
  if (!parsed.success) return { error: `Invalid conversionId` };
  return { conversionId: parsed.data.conversionId };
}

export function parseRuleIdParams(params: unknown): { ruleId: string } | { error: string } {
  const parsed = ruleIdParamsSchema.safeParse(params);
  if (!parsed.success) return { error: `Invalid ruleId` };
  return { ruleId: parsed.data.ruleId };
}

export type ExchangeQuoteInput = z.infer<typeof exchangeQuoteSchema>;
export type ExchangeConversionInput = z.infer<typeof exchangeConversionSchema>;
export type CreateExchangeRuleInput = z.infer<typeof createExchangeRuleSchema>;
export type UpdateExchangeRuleInput = z.infer<typeof updateExchangeRuleSchema>;
