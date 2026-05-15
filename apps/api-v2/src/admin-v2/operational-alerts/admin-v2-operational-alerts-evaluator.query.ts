import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

export type DueAlertRow = {
  id: string;
  owner_id: string;
  workspace: string;
  name: string;
  query_payload: unknown;
  threshold_payload: unknown;
  evaluation_interval_minutes: number;
  last_evaluated_at: Date | null;
};

@Injectable()
export class AdminV2OperationalAlertsEvaluatorQuery {
  constructor(private readonly prisma: PrismaService) {}

  selectDueAlerts(limit: number): Promise<DueAlertRow[]> {
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
}
