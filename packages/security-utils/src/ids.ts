import * as crypto from 'crypto';

/** Generate a new UUID v4. Centralized so callers never reach into `node:crypto`. */
export function newUuid(): string {
  return crypto.randomUUID();
}
