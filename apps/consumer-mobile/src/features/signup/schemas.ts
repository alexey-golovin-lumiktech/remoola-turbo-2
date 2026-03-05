import { z } from 'zod';

export const signupSearchParamsSchema = z.object({
  next: z.string().optional(),
  googleSignupToken: z.string().optional(),
  accountType: z.enum([`business`, `contractor`]).optional(),
  contractorKind: z.enum([`individual`, `entity`]).optional(),
});

export const verificationSearchParamsSchema = z.object({
  email: z.string().optional(),
  verified: z.enum([`yes`, `no`]).optional(),
});

export type SignupSearchParams = z.infer<typeof signupSearchParamsSchema>;
export type VerificationSearchParams = z.infer<typeof verificationSearchParamsSchema>;
