import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { parsePartitionMonthStart, startOfMonth, toPartitionName } from './consumer-action-log-partition.util';
import { envs } from '../../envs';
import { ConsumerActionLogMaintenanceRepository } from '../../shared/consumer-action-log-maintenance.repository';

const BOUNDARY_DELETE_BATCH_SIZE = 5000;
const MAX_BOUNDARY_DELETE_BATCHES = 24;

@Injectable()
export class ConsumerActionLogRetentionScheduler {
  private readonly logger = new Logger(ConsumerActionLogRetentionScheduler.name);

  constructor(private readonly maintenanceRepository: ConsumerActionLogMaintenanceRepository) {}

  private async deleteBoundaryRowsFromPartition(
    partitionName: string,
    cutoffMonthStart: Date,
    retentionCutoff: Date,
  ): Promise<number> {
    let deletedRows = 0;

    for (let i = 0; i < MAX_BOUNDARY_DELETE_BATCHES; i += 1) {
      const deletedThisBatch = await this.maintenanceRepository.deleteBoundaryRowsBatch(
        partitionName,
        cutoffMonthStart,
        retentionCutoff,
        BOUNDARY_DELETE_BATCH_SIZE,
      );
      deletedRows += deletedThisBatch;

      if (deletedThisBatch < BOUNDARY_DELETE_BATCH_SIZE) {
        break;
      }
    }

    return deletedRows;
  }

  @Cron(envs.CONSUMER_ACTION_LOG_RETENTION_CRON)
  async enforceRetention() {
    try {
      const retentionCutoff = new Date(Date.now() - envs.CONSUMER_ACTION_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const cutoffMonthStart = startOfMonth(retentionCutoff);

      const partitionNames = await this.maintenanceRepository.listPartitionNames();

      let droppedCount = 0;
      for (const partitionName of partitionNames) {
        const monthStart = parsePartitionMonthStart(partitionName);
        if (monthStart == null) continue;
        if (monthStart >= cutoffMonthStart) continue;

        await this.maintenanceRepository.dropPartition(partitionName);
        droppedCount += 1;
      }

      const availablePartitionNames = new Set(partitionNames);
      const boundaryPartitionNames = [toPartitionName(cutoffMonthStart), `consumer_action_log_pdefault`].filter(
        (name) => availablePartitionNames.has(name),
      );

      let boundaryDeletedRows = 0;
      for (const partitionName of boundaryPartitionNames) {
        boundaryDeletedRows += await this.deleteBoundaryRowsFromPartition(
          partitionName,
          cutoffMonthStart,
          retentionCutoff,
        );
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
