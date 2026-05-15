import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from './prisma.service';

type PartitionRow = { partitionName: string };
type ConsumerActionLogPartitionName = string & { readonly __brand: unique symbol };

const CONSUMER_ACTION_LOG_PARTITION_NAME_REGEX = /^consumer_action_log_p(?:\d{6}|default)$/;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, `""`)}"`;
}

export function assertConsumerActionLogPartitionName(partitionName: string): ConsumerActionLogPartitionName {
  if (!CONSUMER_ACTION_LOG_PARTITION_NAME_REGEX.test(partitionName)) {
    throw new Error(`Unsafe consumer_action_log partition name`);
  }

  return partitionName as ConsumerActionLogPartitionName;
}

function partitionIdentifierSql(partitionName: string): Prisma.Sql {
  const safePartitionName = assertConsumerActionLogPartitionName(partitionName);
  return Prisma.raw(quoteIdentifier(safePartitionName));
}

@Injectable()
export class ConsumerActionLogMaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  ensureMonthlyPartition(partitionName: string, partitionStart: Date, partitionEnd: Date) {
    return this.prisma.$executeRaw(Prisma.sql`
      CREATE TABLE IF NOT EXISTS ${partitionIdentifierSql(partitionName)}
         PARTITION OF "consumer_action_log"
         FOR VALUES FROM (${partitionStart.toISOString()}::timestamptz) TO (${partitionEnd.toISOString()}::timestamptz)
    `);
  }

  ensureDefaultPartition() {
    return this.prisma.$executeRaw(
      Prisma.sql`CREATE TABLE IF NOT EXISTS "consumer_action_log_pdefault"
        PARTITION OF "consumer_action_log"
        DEFAULT`,
    );
  }

  async listPartitionNames(): Promise<string[]> {
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

    return partitions.map((partition) => partition.partitionName);
  }

  dropPartition(partitionName: string) {
    return this.prisma.$executeRaw(Prisma.sql`DROP TABLE IF EXISTS ${partitionIdentifierSql(partitionName)}`);
  }

  deleteBoundaryRowsBatch(
    partitionName: string,
    cutoffMonthStart: Date,
    retentionCutoff: Date,
    batchSize: number,
  ): Promise<number> {
    return this.prisma.$executeRaw(Prisma.sql`
      WITH doomed AS (
         SELECT "id", "created_at"
         FROM ${partitionIdentifierSql(partitionName)}
         WHERE "created_at" >= ${cutoffMonthStart.toISOString()}::timestamptz
           AND "created_at" < ${retentionCutoff.toISOString()}::timestamptz
         ORDER BY "created_at" ASC, "id" ASC
         LIMIT ${batchSize}
       )
       DELETE FROM ${partitionIdentifierSql(partitionName)} AS target
       USING doomed
       WHERE target."id" = doomed."id"
         AND target."created_at" = doomed."created_at"
    `);
  }
}
