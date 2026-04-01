import { sanitizeNextForRedirect } from '@remoola/api-types';

export function sanitizeContactsReturnTo(raw: string | null | undefined): string {
  return sanitizeNextForRedirect(raw, ``);
}
