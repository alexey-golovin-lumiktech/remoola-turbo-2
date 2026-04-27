/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { ConsumerActionLogRetentionScheduler } from '../src/consumer/auth/consumer-action-log-retention.scheduler';
import { envs } from '../src/envs';
import { type PrismaService } from '../src/shared/prisma.service';

describe(`Consumer action log retention smoke (e2e, isolated DB)`, () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(`keeps records newer than cutoff and deletes records older than cutoff in boundary window`, async () => {
    const originalRetentionDays = envs.CONSUMER_ACTION_LOG_RETENTION_DAYS;
    try {
      envs.CONSUMER_ACTION_LOG_RETENTION_DAYS = 7;

      const retentionCutoff = new Date(Date.now() - envs.CONSUMER_ACTION_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const staleCreatedAt = new Date(retentionCutoff.getTime() - 60 * 60 * 1000);
      const freshCreatedAt = new Date(retentionCutoff.getTime() + 60 * 60 * 1000);
      const actionSuffix = `${Date.now()}`;

      await prisma.consumerActionLogModel.create({
        data: {
          deviceId: `retention-stale-device-${actionSuffix}`,
          action: `consumer.auth.retention_stale_${actionSuffix}`,
          resource: `auth`,
          metadata: { method: `POST`, path: `/api/consumer/auth/refresh` },
          createdAt: staleCreatedAt,
        },
      });
      await prisma.consumerActionLogModel.create({
        data: {
          deviceId: `retention-fresh-device-${actionSuffix}`,
          action: `consumer.auth.retention_fresh_${actionSuffix}`,
          resource: `auth`,
          metadata: { method: `POST`, path: `/api/consumer/auth/refresh` },
          createdAt: freshCreatedAt,
        },
      });

      const scheduler = new ConsumerActionLogRetentionScheduler(prisma as unknown as PrismaService);
      await scheduler.enforceRetention();

      const staleCount = await prisma.consumerActionLogModel.count({
        where: { action: `consumer.auth.retention_stale_${actionSuffix}` },
      });
      const freshCount = await prisma.consumerActionLogModel.count({
        where: { action: `consumer.auth.retention_fresh_${actionSuffix}` },
      });

      expect(staleCount).toBe(0);
      expect(freshCount).toBe(1);
    } finally {
      envs.CONSUMER_ACTION_LOG_RETENTION_DAYS = originalRetentionDays;
    }
  });
});
