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

// Type inference from schemas
export type CreateAdminForm = z.infer<typeof createAdminSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type UpdateAdminForm = z.infer<typeof updateAdminSchema>;

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
