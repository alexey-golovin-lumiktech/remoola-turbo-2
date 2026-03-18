import { z } from 'zod';

import { AUTH_NOTICE_QUERY, emailSchema, parseAuthNotice } from '@remoola/api-types';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, `Password is required`),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, `Password must be at least 8 characters`),
    confirmPassword: z.string().min(1, `Please confirm your password`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: `Passwords do not match`,
    path: [`confirmPassword`],
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
  if (decoded === `/logout` || decoded.startsWith(`/logout?`)) return DEFAULT_NEXT_PATH;

  return decoded;
};

export const parseSearchParams = (searchParams: Record<string, string | string[] | undefined>) => {
  const next = searchParams.next;
  const raw = typeof next === `string` ? next : Array.isArray(next) && next[0] ? next[0] : undefined;
  const nextPath = sanitizeNextPath(raw);

  const sessionExpiredParam = searchParams.session_expired;
  const sessionExpired = sessionExpiredParam === `true` || sessionExpiredParam === `1`;
  const authNoticeParam = searchParams[AUTH_NOTICE_QUERY];
  const authNoticeRaw =
    typeof authNoticeParam === `string`
      ? authNoticeParam
      : Array.isArray(authNoticeParam) && authNoticeParam[0]
        ? authNoticeParam[0]
        : undefined;
  const authNotice = parseAuthNotice(authNoticeRaw);

  return { nextPath, sessionExpired, authNotice };
};
