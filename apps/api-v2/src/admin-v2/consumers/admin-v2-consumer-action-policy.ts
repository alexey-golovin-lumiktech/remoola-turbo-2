import { BadRequestException } from '@nestjs/common';

const FLAG_MAX_LEN = 64;
const REASON_MAX_LEN = 500;

export function normalizeFlag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, `_`)
    .replace(/^_+|_+$/g, ``)
    .slice(0, FLAG_MAX_LEN);
}

export function normalizeOptionalReason(raw: string | null | undefined): string | null {
  return raw?.trim() ? raw.trim().slice(0, REASON_MAX_LEN) : null;
}

export function validateConsumerSuspensionReason(raw: string | null | undefined): string {
  const reason = raw?.trim();
  if (!reason) {
    throw new BadRequestException(`Suspension reason is required`);
  }
  if (reason.length > REASON_MAX_LEN) {
    throw new BadRequestException(`Suspension reason is too long`);
  }
  return reason;
}
