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
  if (decoded === `/logout` || decoded.startsWith(`/logout`)) return DEFAULT_NEXT_PATH;

  return decoded;
};

const searchParamsSchema = z
  .object({
    next: z.union([z.string(), z.array(z.string())]).optional(),
    session_expired: z.union([z.string(), z.array(z.string())]).optional(),
    [AUTH_NOTICE_QUERY]: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .loose();

export const parseSearchParams = (searchParams: Record<string, string | string[] | undefined>) => {
  const validated = searchParamsSchema.parse(searchParams);

  const next = validated.next;
  const raw = typeof next === `string` ? next : Array.isArray(next) && next[0] ? next[0] : undefined;
  const nextPath = sanitizeNextPath(raw);

  const rawSessionExpired = validated.session_expired;
  const sessionExpiredParam =
    typeof rawSessionExpired === `string`
      ? rawSessionExpired
      : Array.isArray(rawSessionExpired) && rawSessionExpired[0]
        ? rawSessionExpired[0]
        : undefined;
  const sessionExpired = sessionExpiredParam === `true` || sessionExpiredParam === `1`;
  const authNoticeParam = validated[AUTH_NOTICE_QUERY];
  const authNoticeRaw =
    typeof authNoticeParam === `string`
      ? authNoticeParam
      : Array.isArray(authNoticeParam) && authNoticeParam[0]
        ? authNoticeParam[0]
        : undefined;
  const authNotice = parseAuthNotice(authNoticeRaw);

  return { nextPath, sessionExpired, authNotice };
};
