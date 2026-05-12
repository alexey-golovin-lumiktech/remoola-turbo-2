type SchedulerEnv = Env & {
  CRON_SECRET: string;
  VERCEL_AUTOMATION_BYPASS_SECRET: string;
};

type DrainResult = {
  claimed: number;
  sent: number;
  failed: number;
};

const REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_DRAIN_LIMIT = 25;
const MIN_DRAIN_LIMIT = 1;
const MAX_DRAIN_LIMIT = 25;

function requireEnv(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function resolveDrainLimit(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_DRAIN_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DRAIN_LIMIT;
  return Math.min(MAX_DRAIN_LIMIT, Math.max(MIN_DRAIN_LIMIT, parsed));
}

function buildDrainUrl(env: SchedulerEnv): string {
  const url = new URL(requireEnv(env.OUTBOX_DRAIN_URL, "OUTBOX_DRAIN_URL"));
  url.searchParams.set("limit", String(resolveDrainLimit(env.OUTBOX_DRAIN_LIMIT)));
  return url.toString();
}

function buildDrainHeaders(env: SchedulerEnv): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireEnv(env.CRON_SECRET, "CRON_SECRET")}`,
    "User-Agent": "remoola-outbox-scheduler/1.0",
    "x-vercel-protection-bypass": requireEnv(
      env.VERCEL_AUTOMATION_BYPASS_SECRET,
      "VERCEL_AUTOMATION_BYPASS_SECRET",
    ),
  };

  return headers;
}

function parseDrainResult(value: unknown): DrainResult {
  if (value == null || typeof value !== "object") {
    throw new Error("Outbox drain returned an invalid response");
  }

  const result = value as Partial<DrainResult>;
  const { claimed, sent, failed } = result;
  if (typeof claimed !== "number" || typeof sent !== "number" || typeof failed !== "number") {
    throw new Error("Outbox drain returned an invalid response");
  }
  if (!Number.isFinite(claimed) || !Number.isFinite(sent) || !Number.isFinite(failed)) {
    throw new Error("Outbox drain returned an invalid response");
  }

  return {
    claimed,
    sent,
    failed,
  };
}

async function drainOutbox(env: SchedulerEnv): Promise<DrainResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const drainUrl = buildDrainUrl(env);

  try {
    const response = await fetch(drainUrl, {
      method: "GET",
      headers: buildDrainHeaders(env),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Outbox drain failed with ${response.status} ${response.statusText}`);
    }

    return parseDrainResult(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async scheduled(controller: ScheduledController, env: SchedulerEnv): Promise<void> {
    try {
      const result = await drainOutbox(env);
      console.log({
        event: "outbox_scheduler_drain_succeeded",
        scheduledTime: controller.scheduledTime,
        cron: controller.cron,
        limit: resolveDrainLimit(env.OUTBOX_DRAIN_LIMIT),
        claimed: result.claimed,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error({
        event: "outbox_scheduler_drain_failed",
        scheduledTime: controller.scheduledTime,
        cron: controller.cron,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};
