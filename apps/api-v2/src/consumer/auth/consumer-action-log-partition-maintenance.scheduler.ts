import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Prisma } from '@remoola/database-2';

import { addUtcMonths, quoteIdentifier, startOfMonth, toPartitionName } from './consumer-action-log-partition.util';
import { envs } from '../../envs';
import { PrismaService } from '../../shared/prisma.service';

const PARTITION_NAME_WHITELIST_REGEX = /^consumer_action_log_p\d{6}$/;

@Injectable()
export class ConsumerActionLogPartitionMaintenanceScheduler implements OnModuleInit {
  private readonly logger = new Logger(ConsumerActionLogPartitionMaintenanceScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureUpcomingPartitions();
  }

  @Cron(envs.CONSUMER_ACTION_LOG_MAINTENANCE_CRON)
  async ensureUpcomingPartitions() {
    try {
      // UTC contract: keep partition boundaries aligned with migration SQL.
      const nowMonthStartUtc = startOfMonth(new Date());
      const createdPartitionNames: string[] = [];

      for (let monthOffset = 0; monthOffset <= envs.CONSUMER_ACTION_LOG_PARTITION_PRECREATE_MONTHS; monthOffset++) {
        const partitionStart = addUtcMonths(nowMonthStartUtc, monthOffset);
        const partitionEnd = addUtcMonths(partitionStart, 1);
        const partitionName = toPartitionName(partitionStart);
        if (!PARTITION_NAME_WHITELIST_REGEX.test(partitionName)) {
          throw new Error(`Unsafe partition name generated`);
        }

        await this.prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(partitionName)}
             PARTITION OF "consumer_action_log"
             FOR VALUES FROM ($1::timestamptz) TO ($2::timestamptz)`,
          partitionStart.toISOString(),
          partitionEnd.toISOString(),
        );
        createdPartitionNames.push(partitionName);
      }
      await this.prisma.$executeRaw(
        Prisma.sql`CREATE TABLE IF NOT EXISTS "consumer_action_log_pdefault"
          PARTITION OF "consumer_action_log"
          DEFAULT`,
      );
      createdPartitionNames.push(`consumer_action_log_pdefault`);

      this.logger.log(`consumer_action_log partition maintenance ensured: ${createdPartitionNames.join(`, `)}`);
    } catch (err) {
      this.logger.warn(
        `consumer_action_log partition maintenance failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
