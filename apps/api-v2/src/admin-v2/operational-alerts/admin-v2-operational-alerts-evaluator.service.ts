import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Prisma } from '@remoola/database-2';

import {
  LedgerAnomaliesAlertEvaluator,
  type EvaluationResult,
  type OperationalAlertWorkspaceEvaluator,
  type WorkspaceEvaluatorRegistry,
} from './admin-v2-operational-alerts-workspace-evaluators';
import { OPERATIONAL_ALERT_WORKSPACES, type OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';
import { PrismaService } from '../../shared/prisma.service';

import type { OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';

export const EVALUATOR_TICK_MAX_ALERTS = 100;
export const EVALUATOR_PER_ALERT_TIMEOUT_MS = 10_000;
export const EVALUATOR_TICK_WALL_BUDGET_MS = 240_000;
export const EVALUATOR_ERROR_MAX_LENGTH = 500;
export const EVALUATOR_REASON_MAX_LENGTH = 500;

type DueAlertRow = {
  id: string;
  owner_id: string;
  workspace: string;
  name: string;
  query_payload: unknown;
  threshold_payload: unknown;
  evaluation_interval_minutes: number;
  last_evaluated_at: Date | null;
};

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max);
}

class EvaluatorTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Evaluator timeout after ${timeoutMs}ms`);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new EvaluatorTimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

@Injectable()
export class AdminV2OperationalAlertsEvaluatorService {
  private readonly logger = new Logger(AdminV2OperationalAlertsEvaluatorService.name);
  private readonly evaluators: WorkspaceEvaluatorRegistry;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerAnomaliesEvaluator: LedgerAnomaliesAlertEvaluator,
  ) {
    this.evaluators = Object.freeze({
      ledger_anomalies: this.ledgerAnomaliesEvaluator,
    } satisfies Record<OperationalAlertWorkspace, OperationalAlertWorkspaceEvaluator>);
  }

  @Cron(`*/5 * * * *`)
  async evaluateDueAlerts(): Promise<void> {
    const tickStartedAt = Date.now();
    try {
      await this.runTick(tickStartedAt);
    } catch (err) {
      this.logger.warn(`Evaluator tick failed at top level: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async runTick(tickStartedAt: number): Promise<void> {
    const due = await this.selectDueAlerts();
    if (due.length === 0) {
      this.logger.log(`Operational alerts evaluator: no due alerts`);
      return;
    }
    let processed = 0;
    let fired = 0;
    let errored = 0;
    for (const alert of due) {
      if (Date.now() - tickStartedAt > EVALUATOR_TICK_WALL_BUDGET_MS) {
        this.logger.warn(`Operational alerts evaluator: wall budget reached after ${processed}/${due.length} alerts`);
        break;
      }
      const outcome = await this.evaluateOne(alert);
      processed += 1;
      if (outcome === `fired`) fired += 1;
      else if (outcome === `error`) errored += 1;
    }
    this.logger.log(
      `Operational alerts evaluator: processed=${processed} fired=${fired} errored=${errored} (due=${due.length})`,
    );
  }

  async selectDueAlerts(): Promise<DueAlertRow[]> {
    const limit = EVALUATOR_TICK_MAX_ALERTS;
    return this.prisma.$queryRaw<DueAlertRow[]>(Prisma.sql`
      SELECT "id", "owner_id", "workspace", "name", "query_payload", "threshold_payload",
             "evaluation_interval_minutes", "last_evaluated_at"
      FROM "operational_alert"
      WHERE "deleted_at" IS NULL
        AND (
          "last_evaluated_at" IS NULL
          OR "last_evaluated_at" <= NOW() - ("evaluation_interval_minutes" * INTERVAL '1 minute')
        )
      ORDER BY "last_evaluated_at" NULLS FIRST, "id" ASC
      LIMIT ${limit}
    `);
  }

  private async evaluateOne(alert: DueAlertRow): Promise<`fired` | `not_fired` | `error`> {
    const workspace = alert.workspace as OperationalAlertWorkspace;
    const evaluator = (OPERATIONAL_ALERT_WORKSPACES as readonly string[]).includes(workspace)
      ? this.evaluators[workspace]
      : undefined;

    if (!evaluator) {
      await this.recordError(alert.id, `Unknown workspace evaluator: ${alert.workspace}`);
      return `error`;
    }

    let result: EvaluationResult;
    try {
      result = await withTimeout(
        evaluator.evaluate(alert.query_payload, alert.threshold_payload as OperationalAlertThreshold),
        EVALUATOR_PER_ALERT_TIMEOUT_MS,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Operational alert evaluation failed (id=${alert.id}, workspace=${alert.workspace}): ${message}`,
      );
      await this.recordError(alert.id, message);
      return `error`;
    }

    if (result.fired) {
      await this.recordFired(alert.id, result.reason ?? ``);
      return `fired`;
    }
    await this.recordNotFired(alert.id);
    return `not_fired`;
  }

  private async recordFired(alertId: string, reason: string): Promise<void> {
    const truncated = truncate(reason, EVALUATOR_REASON_MAX_LENGTH);
    await this.prisma.operationalAlertModel.update({
      where: { id: alertId },
      data: {
        lastEvaluatedAt: new Date(),
        lastFiredAt: new Date(),
        lastFireReason: truncated,
        lastEvaluationError: null,
      },
    });
  }

  private async recordNotFired(alertId: string): Promise<void> {
    await this.prisma.operationalAlertModel.update({
      where: { id: alertId },
      data: {
        lastEvaluatedAt: new Date(),
        lastEvaluationError: null,
      },
    });
  }

  private async recordError(alertId: string, message: string): Promise<void> {
    const truncated = truncate(message, EVALUATOR_ERROR_MAX_LENGTH);
    await this.prisma.operationalAlertModel.update({
      where: { id: alertId },
      data: {
        lastEvaluatedAt: new Date(),
        lastEvaluationError: truncated,
      },
    });
  }
}
