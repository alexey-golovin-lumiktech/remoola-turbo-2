/**
 * Normalize date string to yyyy-MM-dd for <input type="date">.
 * Accepts ISO datetime (e.g. 2000-03-12T00:00:00.000Z) and returns date-only (2000-03-12).
 */
export function toDateOnly(value: string | undefined | null): string {
  if (value == null || value === ``) return ``;
  return value.includes(`T`) ? value.slice(0, 10) : value;
}
