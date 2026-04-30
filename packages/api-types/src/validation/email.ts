import { z } from 'zod';

const EMAIL_MAX_LENGTH = 254;

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_EMAIL_MESSAGE = `Enter a valid email address`;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_FORMAT.test(trimmed);
}

export const emailSchema = z
  .string()
  .min(1, `Email is required`)
  .max(EMAIL_MAX_LENGTH, `Email is too long`)
  .regex(EMAIL_FORMAT, DEFAULT_EMAIL_MESSAGE);

export const emailOptionalSchema = z.union([
  z.literal(``),
  z.string().max(EMAIL_MAX_LENGTH, `Email is too long`).regex(EMAIL_FORMAT, DEFAULT_EMAIL_MESSAGE),
]);
