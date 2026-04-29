import { z } from 'zod';

/** Max length for a single email address (RFC 5321). */
const EMAIL_MAX_LENGTH = 254;

/**
 * Basic format: non-empty local part, @, domain with at least one dot.
 * Dots are allowed in the local part (e.g. some.email@asdasd.com).
 */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_EMAIL_MESSAGE = `Enter a valid email address`;

/**
 * Returns true if value is a valid email (trimmed, length <= 254, matches EMAIL_FORMAT).
 * Dots in the local part are allowed (e.g. some.email@asdasd.com).
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_FORMAT.test(trimmed);
}

/** Zod schema for required email (min 1, max 254, format). */
export const emailSchema = z
  .string()
  .min(1, `Email is required`)
  .max(EMAIL_MAX_LENGTH, `Email is too long`)
  .regex(EMAIL_FORMAT, DEFAULT_EMAIL_MESSAGE);

/** Zod schema for optional email: empty string or valid email. */
export const emailOptionalSchema = z.union([
  z.literal(``),
  z.string().max(EMAIL_MAX_LENGTH, `Email is too long`).regex(EMAIL_FORMAT, DEFAULT_EMAIL_MESSAGE),
]);
