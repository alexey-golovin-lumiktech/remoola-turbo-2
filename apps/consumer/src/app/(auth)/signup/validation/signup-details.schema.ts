import { z } from 'zod';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../../../types';

export const signupDetailsSchema = z
  .object({
    email: z
      .string()
      .min(1, `Email is required`)
      .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
        message: `Enter a valid email address`,
      }),
    password: z.string().min(1, `Password is required`).min(8, `Password must be at least 8 characters`),
    confirmPassword: z.string().min(1, `Please confirm your password`),
    accountType: z.enum(ACCOUNT_TYPE),
    contractorKind: z.enum(CONTRACTOR_KIND).nullable(),
  })
  .refine((data) => (data.accountType === `CONTRACTOR` ? data.contractorKind !== null : data.contractorKind === null), {
    message: `Choose a contractor kind`,
    path: [`contractorKind`],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: `Passwords do not match`,
    path: [`confirmPassword`],
  });
