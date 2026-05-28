import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ConsumerActionLogRetentionScheduler } from './consumer-action-log-retention.scheduler';
// eslint-disable-next-line max-len
import { type ConsumerActionLogMaintenanceRepository } from '../../../shared/consumer-action-log-maintenance.repository';

describe(`ConsumerActionLogRetentionScheduler`, () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`2026-03-16T12:00:00.000Z`));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it(`drops fully expired monthly partitions and runs boundary delete`, async () => {
    const maintenanceRepository = {
      deleteBoundaryRowsBatch: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      dropPartition: jest.fn<(...a: any[]) => any>().mockResolvedValue(0),
      listPartitionNames: jest
        .fn<(...a: any[]) => any>()
        .mockResolvedValue([
          `consumer_action_log_p202601`,
          `consumer_action_log_p202602`,
          `consumer_action_log_p202603`,
        ]),
    } as unknown as ConsumerActionLogMaintenanceRepository;

    const scheduler = new ConsumerActionLogRetentionScheduler(maintenanceRepository);
    await scheduler.enforceRetention();

    expect(maintenanceRepository.listPartitionNames).toHaveBeenCalledTimes(1);
    expect(maintenanceRepository.dropPartition).toHaveBeenCalledWith(`consumer_action_log_p202601`);
    expect(maintenanceRepository.deleteBoundaryRowsBatch).toHaveBeenCalledWith(
      `consumer_action_log_p202602`,
      expect.any(Date),
      expect.any(Date),
      5000,
    );
  });

  it(`runs multiple boundary batches until less than batch size is deleted`, async () => {
    const maintenanceRepository = {
      deleteBoundaryRowsBatch: jest.fn<(...a: any[]) => any>().mockResolvedValueOnce(5000).mockResolvedValueOnce(1000),
      dropPartition: jest.fn<(...a: any[]) => any>(),
      listPartitionNames: jest.fn<(...a: any[]) => any>().mockResolvedValue([`consumer_action_log_p202602`]),
    } as unknown as ConsumerActionLogMaintenanceRepository;

    const scheduler = new ConsumerActionLogRetentionScheduler(maintenanceRepository);
    await scheduler.enforceRetention();

    expect(maintenanceRepository.deleteBoundaryRowsBatch).toHaveBeenCalledTimes(2);
    expect(maintenanceRepository.deleteBoundaryRowsBatch).toHaveBeenNthCalledWith(
      1,
      `consumer_action_log_p202602`,
      expect.any(Date),
      expect.any(Date),
      5000,
    );
  });

  it(`does not throw when retention run fails`, async () => {
    const maintenanceRepository = {
      deleteBoundaryRowsBatch: jest.fn<(...a: any[]) => any>(),
      dropPartition: jest.fn<(...a: any[]) => any>(),
      listPartitionNames: jest.fn<(...a: any[]) => any>().mockRejectedValue(new Error(`db unavailable`)),
    } as unknown as ConsumerActionLogMaintenanceRepository;

    const scheduler = new ConsumerActionLogRetentionScheduler(maintenanceRepository);
    await expect(scheduler.enforceRetention()).resolves.toBeUndefined();
  });
});
