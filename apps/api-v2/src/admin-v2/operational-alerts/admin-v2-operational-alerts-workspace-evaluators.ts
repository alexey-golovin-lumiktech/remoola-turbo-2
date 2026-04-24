import { Injectable } from '@nestjs/common';

import { type OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';
import { type OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';
import { LEDGER_ANOMALY_CLASSES, type LedgerAnomalyClass } from '../ledger/anomalies/admin-v2-ledger-anomalies.dto';
import { AdminV2LedgerAnomaliesService } from '../ledger/anomalies/admin-v2-ledger-anomalies.service';

export type EvaluationResult = {
  fired: boolean;
  reason: string | null;
  observedValue?: number;
};

export interface OperationalAlertWorkspaceEvaluator {
  evaluate(queryPayload: unknown, thresholdPayload: OperationalAlertThreshold): Promise<EvaluationResult>;
}

const DEFAULT_LOOKBACK_DAYS = 1;

function defaultDateFromForAlerts(now: Date): string {
  const since = new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return since.toISOString().slice(0, 10);
}

function defaultDateToForAlerts(now: Date): string {
  return now.toISOString().slice(0, 10);
}

type LedgerAnomaliesQuery = {
  class: LedgerAnomalyClass;
  dateFrom: string;
  dateTo: string;
};

function parseLedgerAnomaliesQueryPayload(raw: unknown, now: Date): LedgerAnomaliesQuery {
  if (!raw || typeof raw !== `object` || Array.isArray(raw)) {
    throw new Error(`queryPayload must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  const cls = obj.class;
  if (typeof cls !== `string` || !(LEDGER_ANOMALY_CLASSES as readonly string[]).includes(cls)) {
    throw new Error(`queryPayload.class must be one of: ${LEDGER_ANOMALY_CLASSES.join(`, `)}`);
  }
  const dateFrom =
    typeof obj.dateFrom === `string` && obj.dateFrom.length > 0 ? obj.dateFrom : defaultDateFromForAlerts(now);
  const dateTo = typeof obj.dateTo === `string` && obj.dateTo.length > 0 ? obj.dateTo : defaultDateToForAlerts(now);
  return { class: cls as LedgerAnomalyClass, dateFrom, dateTo };
}

@Injectable()
export class LedgerAnomaliesAlertEvaluator implements OperationalAlertWorkspaceEvaluator {
  constructor(private readonly anomalies: AdminV2LedgerAnomaliesService) {}

  async evaluate(queryPayload: unknown, threshold: OperationalAlertThreshold): Promise<EvaluationResult> {
    const parsed = parseLedgerAnomaliesQueryPayload(queryPayload, new Date());
    const count = await this.anomalies.getCount(parsed.class, parsed.dateFrom, parsed.dateTo);

    if (threshold.type === `count_gt`) {
      const fired = count > threshold.value;
      return {
        fired,
        reason: fired ? `count=${count} exceeded threshold=${threshold.value} (count_gt)` : null,
        observedValue: count,
      };
    }
    const _exhaustive: never = threshold.type as never;
    throw new Error(`Unhandled threshold type for ledger_anomalies: ${String(_exhaustive)}`);
  }
}

export type WorkspaceEvaluatorRegistry = Readonly<
  Record<OperationalAlertWorkspace, OperationalAlertWorkspaceEvaluator>
>;
