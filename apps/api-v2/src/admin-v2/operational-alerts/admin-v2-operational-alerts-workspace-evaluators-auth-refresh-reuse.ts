import { Injectable } from '@nestjs/common';

import { type OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';
import {
  type EvaluationResult,
  type OperationalAlertWorkspaceEvaluator,
} from './admin-v2-operational-alerts-workspace-evaluators';
import { AUTH_AUDIT_EVENTS } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(queryPayload: unknown, threshold: OperationalAlertThreshold): Promise<EvaluationResult> {
    const { windowMinutes } = parseQueryPayload(queryPayload);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const count = await this.prisma.authAuditLogModel.count({
      where: {
        identityType: `admin`,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
        createdAt: { gte: since },
      },
    });

    if (threshold.type === `count_gt`) {
      const fired = count > threshold.value;
      return {
        fired,
        reason: fired
          ? `refresh_reuse count=${count} in last ${windowMinutes}m exceeded threshold=${threshold.value} (count_gt)`
          : null,
        observedValue: count,
      };
    }
    const _exhaustive: never = threshold.type as never;
    throw new Error(`Unhandled threshold type for auth_refresh_reuse: ${String(_exhaustive)}`);
  }
}
