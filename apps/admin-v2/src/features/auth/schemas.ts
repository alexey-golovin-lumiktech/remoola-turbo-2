import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim(),
});
