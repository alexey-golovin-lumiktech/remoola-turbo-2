import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2ConsumerActivityQuery } from './admin-v2-consumer-activity.query';
import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';

describe(`AdminV2ConsumerActivityQuery`, () => {
  it(`builds auth-history filters from consumer id, lowercased email, and explicit date range`, async () => {
    const authFindMany = jest.fn<(...a: any[]) => any>().mockResolvedValue([{ id: `auth-1` }]);
    const authCount = jest.fn<(...a: any[]) => any>().mockResolvedValue(1);
    const prisma = {
      authAuditLogModel: {
        findMany: authFindMany,
        count: authCount,
      },
      consumerActionLogModel: {
        findMany: jest.fn<(...a: any[]) => any>(),
        count: jest.fn<(...a: any[]) => any>(),
      },
    } as any;
    const query = new AdminV2ConsumerActivityQuery(prisma);
    const dateFrom = new Date(`2026-05-01T00:00:00.000Z`);
    const dateTo = new Date(`2026-05-07T00:00:00.000Z`);

    await expect(
      query.getConsumerAuthHistory({
        consumerId: `consumer-1`,
        consumerEmail: `Consumer@Example.com`,
        page: 2,
        pageSize: 5,
        dateFrom,
        dateTo,
      }),
    ).resolves.toEqual({
      items: [{ id: `auth-1` }],
      total: 1,
      page: 2,
      pageSize: 5,
    });

    expect(authFindMany).toHaveBeenCalledWith({
      where: {
        identityType: AUTH_IDENTITY_TYPES.consumer,
        OR: [{ identityId: `consumer-1` }, { email: `consumer@example.com` }],
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      orderBy: { createdAt: `desc` },
      skip: 5,
      take: 5,
    });
    expect(authCount).toHaveBeenCalledWith({
      where: {
        identityType: AUTH_IDENTITY_TYPES.consumer,
        OR: [{ identityId: `consumer-1` }, { email: `consumer@example.com` }],
        createdAt: { gte: dateFrom, lte: dateTo },
      },
    });
  });

  it(`builds action-log filters with trimmed action and default date window`, async () => {
    jest.useFakeTimers().setSystemTime(new Date(`2026-05-14T12:00:00.000Z`));

    const actionFindMany = jest.fn<(...a: any[]) => any>().mockResolvedValue([{ id: `action-1` }]);
    const actionCount = jest.fn<(...a: any[]) => any>().mockResolvedValue(1);
    const prisma = {
      authAuditLogModel: {
        findMany: jest.fn<(...a: any[]) => any>(),
        count: jest.fn<(...a: any[]) => any>(),
      },
      consumerActionLogModel: {
        findMany: actionFindMany,
        count: actionCount,
      },
    } as any;
    const query = new AdminV2ConsumerActivityQuery(prisma);

    await expect(
      query.getConsumerActionLog({
        consumerId: `consumer-1`,
        action: `  PASSWORD_RESET  `,
      }),
    ).resolves.toEqual({
      items: [{ id: `action-1` }],
      total: 1,
      page: 1,
      pageSize: 10,
      dateFrom: new Date(`2026-05-07T12:00:00.000Z`),
      dateTo: new Date(`2026-05-14T12:00:00.000Z`),
    });

    expect(actionFindMany).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        action: `PASSWORD_RESET`,
        createdAt: {
          gte: new Date(`2026-05-07T12:00:00.000Z`),
          lte: new Date(`2026-05-14T12:00:00.000Z`),
        },
      },
      orderBy: { createdAt: `desc` },
      skip: 0,
      take: 10,
    });
    expect(actionCount).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        action: `PASSWORD_RESET`,
        createdAt: {
          gte: new Date(`2026-05-07T12:00:00.000Z`),
          lte: new Date(`2026-05-14T12:00:00.000Z`),
        },
      },
    });

    jest.useRealTimers();
  });
});
