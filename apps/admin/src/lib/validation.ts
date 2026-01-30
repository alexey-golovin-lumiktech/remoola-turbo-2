'use client';

import { useState, useCallback } from 'react';
import { z } from 'zod';

// Common validation schemas
export const emailSchema = z
  .string()
  .min(1, `Email is required`)
  .email(`Please enter a valid email address`)
  .max(254, `Email is too long`);

export const passwordSchema = z
  .string()
  .min(8, `Password must be at least 8 characters`)
  .max(128, `Password is too long`)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    `Password must contain at least one lowercase letter, one uppercase letter, and one number`,
  );

export const adminTypeSchema = z.enum([`ADMIN`, `SUPER`]);

// Form schemas
export const createAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  type: adminTypeSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const updateAdminSchema = z.object({
  action: z.enum([`delete`, `restore`]),
});

export const exchangeRateSchema = z
  .object({
    fromCurrency: z.string().min(1, `From currency is required`),
    toCurrency: z.string().min(1, `To currency is required`),
    rate: z
      .string()
      .trim()
      .min(1, `Rate is required`)
      .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, `Rate must be a positive number`),
    rateBid: z
      .string()
      .trim()
      .optional()
      .refine((value) => value == null || value === `` || (Number.isFinite(Number(value)) && Number(value) > 0), {
        message: `Bid must be a positive number`,
      }),
    rateAsk: z
      .string()
      .trim()
      .optional()
      .refine((value) => value == null || value === `` || (Number.isFinite(Number(value)) && Number(value) > 0), {
        message: `Ask must be a positive number`,
      }),
    spreadBps: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => value == null || value === `` || (Number.isFinite(Number(value)) && Number(value) >= 0),
        `Spread must be a non-negative number`,
      ),
    status: z.enum([`DRAFT`, `APPROVED`, `DISABLED`]).optional(),
    effectiveAt: z.string().trim().optional(),
    expiresAt: z.string().trim().optional(),
    fetchedAt: z.string().trim().optional(),
    provider: z.string().trim().optional(),
    providerRateId: z.string().trim().optional(),
    confidence: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) =>
          value == null ||
          value === `` ||
          (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100),
        `Confidence must be between 0 and 100`,
      ),
  })
  .refine((data) => data.fromCurrency !== data.toCurrency, {
    message: `Currencies must differ`,
    path: [`toCurrency`],
  })
  .refine(
    (data) => {
      if (!data.rateBid || !data.rateAsk) return true;
      return Number(data.rateBid) <= Number(data.rateAsk);
    },
    { message: `Bid cannot exceed ask`, path: [`rateBid`] },
  );

// Type inference from schemas
export type CreateAdminForm = z.infer<typeof createAdminSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type UpdateAdminForm = z.infer<typeof updateAdminSchema>;
export type ExchangeRateForm = z.infer<typeof exchangeRateSchema>;

// Validation helpers
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join(`.`);
    errors[path] = issue.message;
  });

  return { success: false, errors };
}

// Debounce utility for form inputs
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Form state management hook
export function useFormValidation<T extends Record<string, any>>(schema: z.ZodSchema<T>, initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  const validate = useCallback(() => {
    const result = validateForm(schema, values);
    if (result.success) {
      setErrors({});
      return { success: true, data: result.data };
    }
    // TypeScript now knows result is the error case
    setErrors(result.errors);
    return { success: false, errors: result.errors };
  }, [schema, values]);

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (touched[field as string]) {
        // Clear error when user starts typing
        setErrors((prev) => ({ ...prev, [field as string]: undefined }));
      }
    },
    [touched],
  );

  const setTouched = useCallback((field: keyof T) => {
    setTouchedState((prev) => ({ ...prev, [field as string]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedState({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}
