export type AdminV2IdempotencyRuntimeOptions = {
  entryTtlMs: number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const ENTRY_TTL_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 50;
const POLL_TIMEOUT_MS = 5_000;

export const ADMIN_V2_IDEMPOTENCY_OPTIONS = Symbol(`ADMIN_V2_IDEMPOTENCY_OPTIONS`);

export const DEFAULT_ADMIN_V2_IDEMPOTENCY_OPTIONS: AdminV2IdempotencyRuntimeOptions = {
  entryTtlMs: ENTRY_TTL_MS,
  pollIntervalMs: POLL_INTERVAL_MS,
  pollTimeoutMs: POLL_TIMEOUT_MS,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
