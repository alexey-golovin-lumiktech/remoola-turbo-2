import { z } from 'zod';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../types';

export const signupDetailsSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    accountType: z.enum(ACCOUNT_TYPE),
    contractorKind: z.enum(CONTRACTOR_KIND),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: `Passwords must match`,
    path: [`confirmPassword`],
  });
