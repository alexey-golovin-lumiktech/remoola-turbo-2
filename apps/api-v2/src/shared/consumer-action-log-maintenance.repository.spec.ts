import {
  assertConsumerActionLogPartitionName,
  ConsumerActionLogMaintenanceRepository,
} from './consumer-action-log-maintenance.repository';
import { type PrismaService } from './prisma.service';

describe(`ConsumerActionLogMaintenanceRepository`, () => {
  function buildRepository() {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn(),
    };

    return {
      prisma,
      repository: new ConsumerActionLogMaintenanceRepository(prisma as unknown as PrismaService),
    };
  }

  it(`accepts only consumer_action_log monthly and default partition names`, () => {
    expect(assertConsumerActionLogPartitionName(`consumer_action_log_p202605`)).toBe(`consumer_action_log_p202605`);
    expect(assertConsumerActionLogPartitionName(`consumer_action_log_pdefault`)).toBe(`consumer_action_log_pdefault`);

    expect(() => assertConsumerActionLogPartitionName(`consumer_action_log_202605`)).toThrow(
      `Unsafe consumer_action_log partition name`,
    );
    expect(() =>
      assertConsumerActionLogPartitionName(`consumer_action_log_p202605; DROP TABLE consumer_action_log`),
    ).toThrow(`Unsafe consumer_action_log partition name`);
  });

  it(`rejects unsafe partition names before executing dynamic SQL`, () => {
    const { prisma, repository } = buildRepository();

    expect(() => repository.dropPartition(`consumer_action_log_p202605"; DROP TABLE consumer_action_log; --`)).toThrow(
      `Unsafe consumer_action_log partition name`,
    );
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it(`uses the safe raw execution path for validated dynamic partition identifiers`, async () => {
    const { prisma, repository } = buildRepository();

    await repository.ensureMonthlyPartition(
      `consumer_action_log_p202605`,
      new Date(`2026-05-01T00:00:00.000Z`),
      new Date(`2026-06-01T00:00:00.000Z`),
    );
    await repository.dropPartition(`consumer_action_log_p202605`);
    await repository.deleteBoundaryRowsBatch(
      `consumer_action_log_pdefault`,
      new Date(`2026-05-01T00:00:00.000Z`),
      new Date(`2026-05-15T00:00:00.000Z`),
      5000,
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });
});
