import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma.service';

const EVALUATOR_ERROR_MAX_LENGTH = 500;
const EVALUATOR_REASON_MAX_LENGTH = 500;

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max);
}

@Injectable()
export class AdminV2OperationalAlertsEvaluatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordFired(alertId: string, reason: string): Promise<void> {
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

  async recordNotFired(alertId: string): Promise<void> {
    await this.prisma.operationalAlertModel.update({
      where: { id: alertId },
      data: {
        lastEvaluatedAt: new Date(),
        lastEvaluationError: null,
      },
    });
  }

  async recordError(alertId: string, message: string): Promise<void> {
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
