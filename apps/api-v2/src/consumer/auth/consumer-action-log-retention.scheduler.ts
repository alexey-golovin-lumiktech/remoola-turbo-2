import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Prisma } from '@remoola/database-2';

import { parsePartitionMonthStart, quoteIdentifier, startOfMonth } from './consumer-action-log-partition.util';
import { envs } from '../../envs';
import { PrismaService } from '../../shared/prisma.service';

const BOUNDARY_DELETE_BATCH_SIZE = 5000;
const MAX_BOUNDARY_DELETE_BATCHES = 24;

type PartitionRow = { partitionName: string };

@Injectable()
export class ConsumerActionLogRetentionScheduler {
  private readonly logger = new Logger(ConsumerActionLogRetentionScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(envs.CONSUMER_ACTION_LOG_RETENTION_CRON)
  async enforceRetention() {
    try {
      const retentionCutoff = new Date(Date.now() - envs.CONSUMER_ACTION_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const cutoffMonthStart = startOfMonth(retentionCutoff);

      const partitions = await this.prisma.$queryRaw<PartitionRow[]>(Prisma.sql`
        SELECT child.relname AS "partitionName"
        FROM pg_inherits
        INNER JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        INNER JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        INNER JOIN pg_namespace ns ON child.relnamespace = ns.oid
        WHERE parent.relname = 'consumer_action_log'
          AND ns.nspname = current_schema()
        ORDER BY child.relname
      `);

      let droppedCount = 0;
      for (const { partitionName } of partitions) {
        const monthStart = parsePartitionMonthStart(partitionName);
        if (monthStart == null) continue;
        if (monthStart >= cutoffMonthStart) continue;

        // Identifier interpolation is unavoidable for dynamic partition DDL, but
        // parsePartitionMonthStart guarantees the partition naming whitelist.
        await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${quoteIdentifier(partitionName)}`);
        droppedCount += 1;
      }

      let boundaryDeletedRows = 0;
      for (let i = 0; i < MAX_BOUNDARY_DELETE_BATCHES; i += 1) {
        const deletedThisBatch = await this.prisma.$executeRaw(
          Prisma.sql`WITH doomed AS (
             SELECT "id", "created_at"
             FROM "consumer_action_log"
             WHERE "created_at" >= ${cutoffMonthStart.toISOString()}::timestamptz
               AND "created_at" < ${retentionCutoff.toISOString()}::timestamptz
             ORDER BY "created_at" ASC, "id" ASC
             LIMIT ${BOUNDARY_DELETE_BATCH_SIZE}
           )
           DELETE FROM "consumer_action_log" AS target
           USING doomed
           WHERE target."id" = doomed."id"
             AND target."created_at" = doomed."created_at"`,
        );
        boundaryDeletedRows += deletedThisBatch;
        if (deletedThisBatch < BOUNDARY_DELETE_BATCH_SIZE) {
          break;
        }
      }

      this.logger.log(
        `consumer_action_log retention run complete: ` +
          `dropped_partitions=${droppedCount}, ` +
          `boundary_deleted_rows=${boundaryDeletedRows}`,
      );
    } catch (err) {
      this.logger.warn(`consumer_action_log retention failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
