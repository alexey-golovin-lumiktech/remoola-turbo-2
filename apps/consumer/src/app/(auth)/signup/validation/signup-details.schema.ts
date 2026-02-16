import { z } from 'zod';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../../../types';

/** Schema for email/password signup (password required) */
const signupDetailsBaseSchema = z.object({
  email: z
    .string()
    .min(1, `Email is required`)
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: `Enter a valid email address`,
    }),
  password: z.string(),
  confirmPassword: z.string(),
  accountType: z.enum(ACCOUNT_TYPE),
  contractorKind: z.enum(CONTRACTOR_KIND).nullable(),
});

/** Returns schema for signup details. When hasGoogleToken, password/confirmPassword are optional. */
export function createSignupDetailsSchema(hasGoogleToken: boolean) {
  const passwordSchema = hasGoogleToken
    ? z.string().optional()
    : z.string().min(1, `Password is required`).min(8, `Password must be at least 8 characters`);
  const confirmPasswordSchema = hasGoogleToken
    ? z.string().optional()
    : z.string().min(1, `Please confirm your password`);

  return signupDetailsBaseSchema
    .extend({
      password: passwordSchema,
      confirmPassword: confirmPasswordSchema,
    })
    .refine(
      (data) => (data.accountType === `CONTRACTOR` ? data.contractorKind !== null : data.contractorKind === null),
      {
        message: `Choose a contractor kind`,
        path: [`contractorKind`],
      },
    )
    .refine((data) => hasGoogleToken || data.password === data.confirmPassword, {
      message: `Passwords do not match`,
      path: [`confirmPassword`],
    });
}

/** Default schema for backward compatibility (email signup, password required) */
export const signupDetailsSchema = createSignupDetailsSchema(false);
