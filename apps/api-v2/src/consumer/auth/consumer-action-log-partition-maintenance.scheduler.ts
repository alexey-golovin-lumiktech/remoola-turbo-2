import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { addUtcMonths, startOfMonth, toPartitionName } from './consumer-action-log-partition.util';
import { envs } from '../../envs';
import { ConsumerActionLogMaintenanceRepository } from '../../shared/consumer-action-log-maintenance.repository';

const PARTITION_NAME_WHITELIST_REGEX = /^consumer_action_log_p\d{6}$/;

@Injectable()
export class ConsumerActionLogPartitionMaintenanceScheduler implements OnModuleInit {
  private readonly logger = new Logger(ConsumerActionLogPartitionMaintenanceScheduler.name);

  constructor(private readonly maintenanceRepository: ConsumerActionLogMaintenanceRepository) {}

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

        await this.maintenanceRepository.ensureMonthlyPartition(partitionName, partitionStart, partitionEnd);
        createdPartitionNames.push(partitionName);
      }

      await this.maintenanceRepository.ensureDefaultPartition();
      createdPartitionNames.push(`consumer_action_log_pdefault`);

      this.logger.log(`consumer_action_log partition maintenance ensured: ${createdPartitionNames.join(`, `)}`);
    } catch (err) {
      this.logger.warn(
        `consumer_action_log partition maintenance failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
