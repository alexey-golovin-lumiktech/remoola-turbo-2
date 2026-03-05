'use server';

import { loginSchema } from './schemas';

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export async function validateLoginInput(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid login input`,
        fields: {
          email: fieldErrors.email?.[0] ?? ``,
          password: fieldErrors.password?.[0] ?? ``,
        },
      },
    };
  }
  return { ok: true };
}
