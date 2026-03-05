import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, `Email is required`).email(`Invalid email`),
  password: z.string().min(1, `Password is required`),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const parseSearchParams = (searchParams: Record<string, string | string[] | undefined>) => {
  const next = searchParams.next;
  const raw = typeof next === `string` ? next : Array.isArray(next) && next[0] ? next[0] : undefined;
  const nextPath = raw && raw.length > 0 ? decodeURIComponent(raw) : `/dashboard`;

  const sessionExpiredParam = searchParams.session_expired;
  const sessionExpired = sessionExpiredParam === `true` || sessionExpiredParam === `1`;

  return { nextPath, sessionExpired };
};
