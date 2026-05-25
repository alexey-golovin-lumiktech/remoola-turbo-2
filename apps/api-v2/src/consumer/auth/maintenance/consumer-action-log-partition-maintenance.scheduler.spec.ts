import { ConsumerActionLogPartitionMaintenanceScheduler } from './consumer-action-log-partition-maintenance.scheduler';
import { envs } from '../../../envs';
// eslint-disable-next-line max-len
import { type ConsumerActionLogMaintenanceRepository } from '../../../shared/consumer-action-log-maintenance.repository';

describe(`ConsumerActionLogPartitionMaintenanceScheduler`, () => {
  it(`delegates module init to partition maintenance`, async () => {
    const maintenanceRepository = {
      ensureDefaultPartition: jest.fn(),
      ensureMonthlyPartition: jest.fn(),
    } as unknown as ConsumerActionLogMaintenanceRepository;
    const scheduler = new ConsumerActionLogPartitionMaintenanceScheduler(maintenanceRepository);
    const ensureUpcomingPartitionsSpy = jest.spyOn(scheduler, `ensureUpcomingPartitions`).mockResolvedValue();

    await scheduler.onModuleInit();

    expect(ensureUpcomingPartitionsSpy).toHaveBeenCalledWith();
  });

  it(`creates current and future monthly partitions`, async () => {
    const maintenanceRepository = {
      ensureDefaultPartition: jest.fn().mockResolvedValue(0),
      ensureMonthlyPartition: jest.fn().mockResolvedValue(0),
    } as unknown as ConsumerActionLogMaintenanceRepository;
    const scheduler = new ConsumerActionLogPartitionMaintenanceScheduler(maintenanceRepository);

    await scheduler.ensureUpcomingPartitions();

    expect(maintenanceRepository.ensureMonthlyPartition).toHaveBeenCalledTimes(
      envs.CONSUMER_ACTION_LOG_PARTITION_PRECREATE_MONTHS + 1,
    );
    expect(maintenanceRepository.ensureMonthlyPartition).toHaveBeenCalledWith(
      expect.stringMatching(/^consumer_action_log_p\d{6}$/),
      expect.any(Date),
      expect.any(Date),
    );
    expect(maintenanceRepository.ensureDefaultPartition).toHaveBeenCalledWith();
  });

  it(`does not throw when db call fails`, async () => {
    const maintenanceRepository = {
      ensureDefaultPartition: jest.fn(),
      ensureMonthlyPartition: jest.fn().mockRejectedValue(new Error(`db unavailable`)),
    } as unknown as ConsumerActionLogMaintenanceRepository;
    const scheduler = new ConsumerActionLogPartitionMaintenanceScheduler(maintenanceRepository);

    await expect(scheduler.ensureUpcomingPartitions()).resolves.toBeUndefined();
  });
});
