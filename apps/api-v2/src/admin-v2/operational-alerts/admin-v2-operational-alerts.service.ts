import { Injectable } from '@nestjs/common';

import { AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

export type OperationalAlertRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type OperationalAlertActorContext = {
  id: string;
  email?: string;
  type: string;
};

export type OperationalAlertSummary = {
  id: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: unknown;
  thresholdPayload: unknown;
  evaluationIntervalMinutes: number;
  lastEvaluatedAt: string | null;
  lastEvaluationError: string | null;
  lastFiredAt: string | null;
  lastFireReason: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class AdminV2OperationalAlertsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly idempotency: AdminV2IdempotencyService,

    private readonly adminActionAudit: AdminActionAuditService,
  ) {}
}
