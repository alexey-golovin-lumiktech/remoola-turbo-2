import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

const operationalAlertListSelect = Prisma.validator<Prisma.OperationalAlertModelSelect>()({
  id: true,
  ownerId: true,
  workspace: true,
  name: true,
  description: true,
  queryPayload: true,
  thresholdPayload: true,
  evaluationIntervalMinutes: true,
  lastEvaluatedAt: true,
  lastEvaluationError: true,
  lastFiredAt: true,
  lastFireReason: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

type OperationalAlertListRow = Prisma.OperationalAlertModelGetPayload<{
  select: typeof operationalAlertListSelect;
}>;

@Injectable()
export class AdminV2OperationalAlertsQuery {
  constructor(private readonly prisma: PrismaService) {}

  listOwnedActiveAlerts(params: {
    ownerId: string;
    workspace: string;
    take: number;
  }): Promise<OperationalAlertListRow[]> {
    return this.prisma.operationalAlertModel.findMany({
      where: {
        ownerId: params.ownerId,
        workspace: params.workspace,
        deletedAt: null,
      },
      orderBy: { name: `asc` },
      take: params.take,
      select: operationalAlertListSelect,
    });
  }
}
