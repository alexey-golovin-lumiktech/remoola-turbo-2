import { ConsumerActionLogRetentionScheduler } from './consumer-action-log-retention.scheduler';
import { type PrismaService } from '../../shared/prisma.service';

describe(`ConsumerActionLogRetentionScheduler`, () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`2026-03-16T12:00:00.000Z`));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it(`drops fully expired monthly partitions and runs boundary delete`, async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { partitionName: `consumer_action_log_p202601` },
          { partitionName: `consumer_action_log_p202602` },
          { partitionName: `consumer_action_log_p202603` },
        ]),
      $executeRaw: jest.fn().mockResolvedValue(0),
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    } as unknown as PrismaService;

    const scheduler = new ConsumerActionLogRetentionScheduler(prisma);
    await scheduler.enforceRetention();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(`DROP TABLE IF EXISTS "consumer_action_log_p202601"`);
    expect(prisma.$executeRaw).toHaveBeenCalledWith(expect.anything());
  });

  it(`runs multiple boundary batches until less than batch size is deleted`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn().mockResolvedValueOnce(5000).mockResolvedValueOnce(1000),
      $executeRawUnsafe: jest.fn(),
    } as unknown as PrismaService;

    const scheduler = new ConsumerActionLogRetentionScheduler(prisma);
    await scheduler.enforceRetention();

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it(`does not throw when retention run fails`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error(`db unavailable`)),
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    } as unknown as PrismaService;

    const scheduler = new ConsumerActionLogRetentionScheduler(prisma);
    await expect(scheduler.enforceRetention()).resolves.toBeUndefined();
  });
});
