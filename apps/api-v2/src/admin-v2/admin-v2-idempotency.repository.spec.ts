import { Prisma } from '@remoola/database-2';

import { AdminV2IdempotencyRepository } from './admin-v2-idempotency.repository';
import { type PrismaService } from '../shared/prisma.service';

describe(`AdminV2IdempotencyRepository`, () => {
  function makeRepository() {
    const prisma = {
      adminActionIdempotencyModel: {
        create: jest.fn(async () => null),
        findUnique: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 1 })),
        deleteMany: jest.fn(async () => ({ count: 0 })),
      },
    };

    return {
      prisma,
      repository: new AdminV2IdempotencyRepository(prisma as unknown as PrismaService),
    };
  }

  it(`loads persisted entries by the compound idempotency key`, async () => {
    const { prisma, repository } = makeRepository();

    await repository.findEntry({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
    });

    expect(prisma.adminActionIdempotencyModel.findUnique).toHaveBeenCalledWith({
      where: {
        adminId_scope_idempotencyKey: {
          adminId: `admin-1`,
          scope: `verification:approve:consumer-1`,
          idempotencyKey: `same-key`,
        },
      },
      select: {
        requestHash: true,
        responseStatus: true,
        responseSnapshot: true,
        expiresAt: true,
      },
    });
  });

  it(`maps response status to explicit pending and succeeded states`, async () => {
    const { prisma, repository } = makeRepository();
    const expiresAt = new Date(`2026-04-17T12:00:00.000Z`);
    prisma.adminActionIdempotencyModel.findUnique.mockResolvedValueOnce({
      requestHash: `hash-1`,
      responseStatus: 0,
      responseSnapshot: Prisma.DbNull,
      expiresAt,
    });
    await expect(
      repository.findEntry({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
      }),
    ).resolves.toEqual({
      requestHash: `hash-1`,
      responseSnapshot: null,
      expiresAt,
      state: `pending`,
    });

    prisma.adminActionIdempotencyModel.findUnique.mockResolvedValueOnce({
      requestHash: `hash-1`,
      responseStatus: 200,
      responseSnapshot: { ok: true },
      expiresAt,
    });
    await expect(
      repository.findEntry({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
      }),
    ).resolves.toEqual({
      requestHash: `hash-1`,
      responseSnapshot: { ok: true },
      expiresAt,
      state: `succeeded`,
    });
  });

  it(`creates pending placeholders with DbNull response snapshots`, async () => {
    const { prisma, repository } = makeRepository();
    const expiresAt = new Date(`2026-04-17T12:00:00.000Z`);

    await repository.createPendingEntry({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      requestHash: `hash-1`,
      expiresAt,
    });

    expect(prisma.adminActionIdempotencyModel.create).toHaveBeenCalledWith({
      data: {
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        idempotencyKey: `same-key`,
        requestHash: `hash-1`,
        responseStatus: 0,
        responseSnapshot: Prisma.DbNull,
        expiresAt,
      },
    });
  });

  it(`stores successful response snapshots only on the matching pending placeholder`, async () => {
    const { prisma, repository } = makeRepository();

    await repository.storeSuccess({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      requestHash: `hash-1`,
      result: { ok: true },
    });

    expect(prisma.adminActionIdempotencyModel.updateMany).toHaveBeenCalledWith({
      where: {
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        idempotencyKey: `same-key`,
        requestHash: `hash-1`,
        responseStatus: 0,
        responseSnapshot: { equals: Prisma.DbNull },
      },
      data: {
        responseStatus: 200,
        responseSnapshot: { ok: true },
      },
    });
  });

  it(`deletes only unfinished placeholders for failed executions`, async () => {
    const { prisma, repository } = makeRepository();

    await repository.deletePendingEntry({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      requestHash: `hash-1`,
    });

    expect(prisma.adminActionIdempotencyModel.deleteMany).toHaveBeenCalledWith({
      where: {
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        idempotencyKey: `same-key`,
        requestHash: `hash-1`,
        responseStatus: 0,
        responseSnapshot: { equals: Prisma.DbNull },
      },
    });
  });

  it(`deletes matching expired entries regardless of pending or succeeded state`, async () => {
    const { prisma, repository } = makeRepository();
    const expiresAt = new Date(`2026-04-17T12:00:00.000Z`);

    await repository.deleteExpiredEntry({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      requestHash: `hash-1`,
      expiresAt,
    });

    expect(prisma.adminActionIdempotencyModel.deleteMany).toHaveBeenCalledWith({
      where: {
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        idempotencyKey: `same-key`,
        requestHash: `hash-1`,
        expiresAt,
      },
    });
  });

  it(`uses a transaction client when one is provided`, async () => {
    const { prisma, repository } = makeRepository();
    const tx = {
      adminActionIdempotencyModel: {
        create: jest.fn(async () => null),
        findUnique: jest.fn(async () => null),
        updateMany: jest.fn(async () => ({ count: 1 })),
        deleteMany: jest.fn(async () => ({ count: 0 })),
      },
    };

    await repository.createPendingEntry({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      requestHash: `hash-1`,
      expiresAt: new Date(`2026-04-17T12:00:00.000Z`),
      client: tx as never,
    });

    expect(tx.adminActionIdempotencyModel.create).toHaveBeenCalledTimes(1);
    expect(prisma.adminActionIdempotencyModel.create).not.toHaveBeenCalled();
  });
});
