import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  AdminV2OperationalAlertsEvaluatorQuery,
  type DueAlertRow,
} from './admin-v2-operational-alerts-evaluator.query';
import { AdminV2OperationalAlertsEvaluatorRepository } from './admin-v2-operational-alerts-evaluator.repository';
import { type OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';
import {
  LedgerAnomaliesAlertEvaluator,
  type EvaluationResult,
  type OperationalAlertWorkspaceEvaluator,
  type WorkspaceEvaluatorRegistry,
} from './admin-v2-operational-alerts-workspace-evaluators';
import { AuthRefreshReuseAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-auth-refresh-reuse';
import { VerificationQueueAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-verification';
import { OPERATIONAL_ALERT_WORKSPACES, type OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';

export const EVALUATOR_TICK_MAX_ALERTS = 100;
export const EVALUATOR_PER_ALERT_TIMEOUT_MS = 10_000;
export const EVALUATOR_TICK_WALL_BUDGET_MS = 240_000;

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
    private readonly query: AdminV2OperationalAlertsEvaluatorQuery,
    private readonly repository: AdminV2OperationalAlertsEvaluatorRepository,
    private readonly ledgerAnomaliesEvaluator: LedgerAnomaliesAlertEvaluator,
    private readonly verificationQueueEvaluator: VerificationQueueAlertEvaluator,
    private readonly authRefreshReuseEvaluator: AuthRefreshReuseAlertEvaluator,
  ) {
    this.evaluators = Object.freeze({
      ledger_anomalies: this.ledgerAnomaliesEvaluator,
      verification_queue: this.verificationQueueEvaluator,
      auth_refresh_reuse: this.authRefreshReuseEvaluator,
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
    return this.query.selectDueAlerts(EVALUATOR_TICK_MAX_ALERTS);
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
    await this.repository.recordFired(alertId, reason);
  }

  private async recordNotFired(alertId: string): Promise<void> {
    await this.repository.recordNotFired(alertId);
  }

  private async recordError(alertId: string, message: string): Promise<void> {
    await this.repository.recordError(alertId, message);
  }
}
