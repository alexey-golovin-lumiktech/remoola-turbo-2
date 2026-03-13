import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, `Email is required`).email(`Invalid email`),
  password: z.string().min(1, `Password is required`),
});

export type LoginInput = z.infer<typeof loginSchema>;

const DEFAULT_NEXT_PATH = `/dashboard`;

const sanitizeNextPath = (rawNext: string | undefined): string => {
  if (!rawNext || rawNext.length === 0) return DEFAULT_NEXT_PATH;

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawNext);
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  if (!decoded.startsWith(`/`)) return DEFAULT_NEXT_PATH;
  if (decoded.startsWith(`//`)) return DEFAULT_NEXT_PATH;
  if (/^https?:\/\//i.test(decoded)) return DEFAULT_NEXT_PATH;
  if (/[\r\n]/.test(decoded)) return DEFAULT_NEXT_PATH;

  return decoded;
};

export const parseSearchParams = (searchParams: Record<string, string | string[] | undefined>) => {
  const next = searchParams.next;
  const raw = typeof next === `string` ? next : Array.isArray(next) && next[0] ? next[0] : undefined;
  const nextPath = sanitizeNextPath(raw);

  const sessionExpiredParam = searchParams.session_expired;
  const sessionExpired = sessionExpiredParam === `true` || sessionExpiredParam === `1`;

  return { nextPath, sessionExpired };
};
