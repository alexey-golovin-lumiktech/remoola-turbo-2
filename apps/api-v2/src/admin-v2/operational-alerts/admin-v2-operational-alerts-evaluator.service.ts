import { Injectable, Logger } from '@nestjs/common';

import { LedgerAnomaliesAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';
import { PrismaService } from '../../shared/prisma.service';

export const EVALUATOR_TICK_MAX_ALERTS = 100;
export const EVALUATOR_PER_ALERT_TIMEOUT_MS = 10_000;
export const EVALUATOR_TICK_WALL_BUDGET_MS = 240_000;

@Injectable()
export class AdminV2OperationalAlertsEvaluatorService {
  private readonly logger = new Logger(AdminV2OperationalAlertsEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly ledgerAnomaliesEvaluator: LedgerAnomaliesAlertEvaluator,
  ) {}
}
