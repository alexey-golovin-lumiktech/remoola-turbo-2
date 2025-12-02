import { z } from 'zod';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../../../types';

export const signupDetailsSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    accountType: z.enum(ACCOUNT_TYPE),
    contractorKind: z.enum(CONTRACTOR_KIND).nullable(),
  })
  .refine((data) => (data.accountType === `CONTRACTOR` ? data.contractorKind !== null : data.contractorKind === null), {
    message: `contractorKind must be provided only for CONTRACTOR and must be null for BUSINESS`,
    path: [`contractorKind`],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: `Passwords must match`,
    path: [`confirmPassword`],
  });
