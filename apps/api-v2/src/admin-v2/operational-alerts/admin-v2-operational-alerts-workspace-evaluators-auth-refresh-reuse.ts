import { Injectable } from '@nestjs/common';

import {
  ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  adminV2AuthRefreshReuseAlertQueryPayloadSchema,
} from '@remoola/api-types';

import { AdminV2OperationalAlertsAuthRefreshReuseQuery } from './admin-v2-operational-alerts-auth-refresh-reuse.query';
import { type OperationalAlertObservation } from './admin-v2-operational-alerts-thresholds';
import { type OperationalAlertWorkspaceEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';

type AuthRefreshReuseQuery = {
  windowMinutes: number;
};

function parseQueryPayload(raw: unknown): AuthRefreshReuseQuery {
  const parsed = adminV2AuthRefreshReuseAlertQueryPayloadSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  if (raw === null || raw === undefined) {
    throw new Error(`queryPayload is required (must include windowMinutes)`);
  }
  const issue = parsed.error.issues[0];
  if (issue?.path[0] === `windowMinutes`) {
    throw new Error(
      `queryPayload.windowMinutes must be integer in [` +
        `${ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES}..${ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES}]`,
    );
  }
  if (issue?.code === `unrecognized_keys`) {
    const key = issue.keys[0];
    throw new Error(`queryPayload key "${key}" is not recognized`);
  }
  throw new Error(`queryPayload must be an object`);
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
