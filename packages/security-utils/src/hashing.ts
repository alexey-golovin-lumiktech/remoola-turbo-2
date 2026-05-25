import * as crypto from 'crypto';

/** SHA-256 hex digest of the input. Use for idempotency keys and payload fingerprints. */
export function sha256Hex(input: string | Buffer): string {
  return crypto.createHash(`sha256`).update(input).digest(`hex`);
}
