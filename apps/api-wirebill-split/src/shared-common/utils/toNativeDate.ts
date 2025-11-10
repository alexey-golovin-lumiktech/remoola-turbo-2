/**
 * Convert anything that looks like a date into a native Date.
 * - Preserves milliseconds
 * - Accepts ISO strings, timestamps, Date
 */
export function toNativeDate<T>(input: T): Date {
  if (!input) return new Date(NaN);
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === `number`) return new Date(input);
  if (typeof input === `string`) return new Date(input);
  return new Date(NaN); // fallback invalid
}
