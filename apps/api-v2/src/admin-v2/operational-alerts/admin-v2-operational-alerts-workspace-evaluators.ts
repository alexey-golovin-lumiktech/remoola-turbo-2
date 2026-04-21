import { Injectable } from '@nestjs/common';

import { AdminV2LedgerAnomaliesService } from '../ledger/anomalies/admin-v2-ledger-anomalies.service';

import type { OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';
import type { OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';

export type EvaluationResult = {
  fired: boolean;
  reason: string | null;
  observedValue?: number;
};

export interface OperationalAlertWorkspaceEvaluator {
  evaluate(queryPayload: unknown, thresholdPayload: OperationalAlertThreshold): Promise<EvaluationResult>;
}

@Injectable()
export class LedgerAnomaliesAlertEvaluator implements OperationalAlertWorkspaceEvaluator {
  constructor(private readonly anomalies: AdminV2LedgerAnomaliesService) {}

  async evaluate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    queryPayload: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    threshold: OperationalAlertThreshold,
  ): Promise<EvaluationResult> {
    throw new Error(`LedgerAnomaliesAlertEvaluator not yet implemented`);
  }
}

export type WorkspaceEvaluatorRegistry = Readonly<
  Record<OperationalAlertWorkspace, OperationalAlertWorkspaceEvaluator>
>;
