import { ConsumerActionLogPartitionMaintenanceScheduler } from './consumer-action-log-partition-maintenance.scheduler';
import { envs } from '../../envs';
import { type PrismaService } from '../../shared/prisma.service';

describe(`ConsumerActionLogPartitionMaintenanceScheduler`, () => {
  it(`creates current and future monthly partitions`, async () => {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    } as unknown as PrismaService;
    const scheduler = new ConsumerActionLogPartitionMaintenanceScheduler(prisma);

    await scheduler.ensureUpcomingPartitions();

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(envs.CONSUMER_ACTION_LOG_PARTITION_PRECREATE_MONTHS + 1);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining(`PARTITION OF "consumer_action_log"`),
      expect.any(String),
      expect.any(String),
    );
    expect(prisma.$executeRaw).toHaveBeenCalledWith(expect.anything());
  });

  it(`does not throw when db call fails`, async () => {
    const prisma = {
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn().mockRejectedValue(new Error(`db unavailable`)),
    } as unknown as PrismaService;
    const scheduler = new ConsumerActionLogPartitionMaintenanceScheduler(prisma);

    await expect(scheduler.ensureUpcomingPartitions()).resolves.toBeUndefined();
  });
});
