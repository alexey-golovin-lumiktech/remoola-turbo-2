import { Injectable } from '@nestjs/common';

import { AdminV2OperationalAlertsAuthRefreshReuseQuery } from './admin-v2-operational-alerts-auth-refresh-reuse.query';
import { type OperationalAlertObservation } from './admin-v2-operational-alerts-thresholds';
import { type OperationalAlertWorkspaceEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';

type AuthRefreshReuseQuery = { windowMinutes: number };

const MIN_WINDOW_MINUTES = 1;
const MAX_WINDOW_MINUTES = 1440;

const SUPPORTED_PAYLOAD_KEYS = new Set([`windowMinutes`]);

function parseQueryPayload(raw: unknown): AuthRefreshReuseQuery {
  if (raw === null || raw === undefined) {
    throw new Error(`queryPayload is required (must include windowMinutes)`);
  }
  if (typeof raw !== `object` || Array.isArray(raw)) {
    throw new Error(`queryPayload must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!SUPPORTED_PAYLOAD_KEYS.has(key)) {
      throw new Error(`queryPayload key "${key}" is not recognized`);
    }
  }
  const w = obj.windowMinutes;
  if (typeof w !== `number` || !Number.isInteger(w) || w < MIN_WINDOW_MINUTES || w > MAX_WINDOW_MINUTES) {
    throw new Error(`queryPayload.windowMinutes must be integer in [${MIN_WINDOW_MINUTES}..${MAX_WINDOW_MINUTES}]`);
  }
  return { windowMinutes: w };
}

@Injectable()
export class AuthRefreshReuseAlertEvaluator implements OperationalAlertWorkspaceEvaluator {
  constructor(private readonly query: AdminV2OperationalAlertsAuthRefreshReuseQuery) {}

  async evaluate(queryPayload: unknown): Promise<OperationalAlertObservation> {
    const { windowMinutes } = parseQueryPayload(queryPayload);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const count = await this.query.countRefreshReuseSince(since);
    return {
      observedValue: count,
      reasonSubject: `refresh_reuse count`,
      reasonDetail: `in last ${windowMinutes}m`,
    };
  }
}
