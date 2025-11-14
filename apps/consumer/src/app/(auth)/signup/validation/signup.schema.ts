import { z } from 'zod';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../types/account.types';

export const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    accountType: z.nativeEnum(ACCOUNT_TYPE),
    contractorKind: z.nativeEnum(CONTRACTOR_KIND),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: `Passwords must match`,
    path: [`confirmPassword`],
  });
