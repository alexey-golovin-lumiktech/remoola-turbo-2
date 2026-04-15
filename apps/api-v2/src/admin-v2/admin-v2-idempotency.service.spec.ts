import { BadRequestException, ConflictException } from '@nestjs/common';

import { AdminV2IdempotencyService } from './admin-v2-idempotency.service';

type StoredEntry = {
  adminId: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  responseStatus: number;
  responseSnapshot: unknown;
  expiresAt: Date;
};

class FakeAdminActionIdempotencyModel {
  private readonly entries = new Map<string, StoredEntry>();

  async create(params: { data: StoredEntry }) {
    const key = this.composeKey(params.data.adminId, params.data.scope, params.data.idempotencyKey);
    if (this.entries.has(key)) {
      const error = new Error(`Unique constraint failed`) as Error & { code?: string };
      error.code = `P2002`;
      throw error;
    }
    this.entries.set(key, { ...params.data });
    return params.data;
  }

  async findUnique(params: {
    where: { adminId_scope_idempotencyKey: { adminId: string; scope: string; idempotencyKey: string } };
  }) {
    const key = this.composeKey(
      params.where.adminId_scope_idempotencyKey.adminId,
      params.where.adminId_scope_idempotencyKey.scope,
      params.where.adminId_scope_idempotencyKey.idempotencyKey,
    );
    const entry = this.entries.get(key);
    return entry
      ? {
          requestHash: entry.requestHash,
          responseSnapshot: entry.responseSnapshot,
          expiresAt: entry.expiresAt,
        }
      : null;
  }

  async update(params: {
    where: { adminId_scope_idempotencyKey: { adminId: string; scope: string; idempotencyKey: string } };
    data: { responseStatus: number; responseSnapshot: unknown };
  }) {
    const key = this.composeKey(
      params.where.adminId_scope_idempotencyKey.adminId,
      params.where.adminId_scope_idempotencyKey.scope,
      params.where.adminId_scope_idempotencyKey.idempotencyKey,
    );
    const entry = this.entries.get(key);
    if (!entry) {
      throw new Error(`Entry not found`);
    }
    this.entries.set(key, {
      ...entry,
      responseStatus: params.data.responseStatus,
      responseSnapshot: params.data.responseSnapshot,
    });
    return this.entries.get(key);
  }

  async deleteMany(params: {
    where: {
      adminId: string;
      scope: string;
      idempotencyKey: string;
      requestHash?: string;
      responseSnapshot?: null;
      expiresAt?: Date;
    };
  }) {
    const key = this.composeKey(params.where.adminId, params.where.scope, params.where.idempotencyKey);
    const entry = this.entries.get(key);
    if (!entry) {
      return { count: 0 };
    }
    if (params.where.requestHash && entry.requestHash !== params.where.requestHash) {
      return { count: 0 };
    }
    if (params.where.responseSnapshot === null && entry.responseSnapshot !== null) {
      return { count: 0 };
    }
    if (params.where.expiresAt && entry.expiresAt.getTime() !== params.where.expiresAt.getTime()) {
      return { count: 0 };
    }
    this.entries.delete(key);
    return { count: 1 };
  }

  private composeKey(adminId: string, scope: string, idempotencyKey: string) {
    return `${adminId}:${scope}:${idempotencyKey}`;
  }
}

describe(`AdminV2IdempotencyService`, () => {
  let service: AdminV2IdempotencyService;
  let model: FakeAdminActionIdempotencyModel;

  beforeEach(() => {
    model = new FakeAdminActionIdempotencyModel();
    service = new AdminV2IdempotencyService({ adminActionIdempotencyModel: model } as never);
  });

  it(`returns the first result for repeated identical requests`, async () => {
    const execute = jest.fn(async () => ({ ok: true }));

    const first = await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });
    const second = await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`replays a stored response across service instances`, async () => {
    const execute = jest.fn(async () => ({ ok: true, status: `approved` }));

    const first = await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    const secondService = new AdminV2IdempotencyService({ adminActionIdempotencyModel: model } as never);
    const second = await secondService.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: jest.fn(async () => ({ ok: false })),
    });

    expect(first).toEqual({ ok: true, status: `approved` });
    expect(second).toEqual({ ok: true, status: `approved` });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`rejects reusing the same key with a different payload`, async () => {
    await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: async () => ({ ok: true }),
    });

    await expect(
      service.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { decision: `reject`, version: 1 },
        execute: async () => ({ ok: false }),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`cleans up an unfinished placeholder when execution fails`, async () => {
    const execute = jest.fn(async () => {
      throw new Error(`boom`);
    });

    await expect(
      service.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { decision: `approve`, version: 1 },
        execute,
      }),
    ).rejects.toThrow(`boom`);

    const retry = await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: async () => ({ ok: true }),
    });

    expect(retry).toEqual({ ok: true });
  });

  it(`requires an idempotency key`, async () => {
    await expect(
      service.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: ``,
        payload: { decision: `approve`, version: 1 },
        execute: async () => ({ ok: true }),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
