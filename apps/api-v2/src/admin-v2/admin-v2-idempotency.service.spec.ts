import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { type AdminV2IdempotencySnapshot } from './admin-v2-idempotency-json.utils';
import { ADMIN_V2_IDEMPOTENCY_OPTIONS, type AdminV2IdempotencyRuntimeOptions } from './admin-v2-idempotency.options';
import {
  ADMIN_V2_IDEMPOTENCY_REPOSITORY,
  type AdminV2IdempotencyRepositoryPort,
} from './admin-v2-idempotency.repository';
import { AdminV2IdempotencyService } from './admin-v2-idempotency.service';
import { PrismaTransactionRunner } from '../shared/prisma-transaction.runner';

type StoredEntry = {
  adminId: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  responseStatus: number;
  responseSnapshot: AdminV2IdempotencySnapshot | null;
  expiresAt: Date;
};

class FakeAdminV2IdempotencyRepository implements AdminV2IdempotencyRepositoryPort {
  private readonly entries = new Map<string, StoredEntry>();

  async createPendingEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
  }) {
    const key = this.composeKey(params.adminId, params.scope, params.key);
    if (this.entries.has(key)) {
      const error = new Error(`Unique constraint failed`) as Error & { code?: string };
      error.code = `P2002`;
      throw error;
    }
    this.entries.set(key, {
      adminId: params.adminId,
      scope: params.scope,
      idempotencyKey: params.key,
      requestHash: params.requestHash,
      responseStatus: 0,
      responseSnapshot: null,
      expiresAt: params.expiresAt,
    });
    return this.entries.get(key);
  }

  async findEntry(params: { adminId: string; scope: string; key: string }) {
    const key = this.composeKey(params.adminId, params.scope, params.key);
    const entry = this.entries.get(key);
    return entry
      ? {
          requestHash: entry.requestHash,
          responseSnapshot: entry.responseSnapshot,
          expiresAt: entry.expiresAt,
          state: entry.responseStatus === 0 ? (`pending` as const) : (`succeeded` as const),
        }
      : null;
  }

  async storeSuccess(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    result: AdminV2IdempotencySnapshot;
  }) {
    const key = this.composeKey(params.adminId, params.scope, params.key);
    const entry = this.entries.get(key);
    if (!entry) {
      throw new Error(`Entry not found`);
    }
    if (entry.requestHash !== params.requestHash || entry.responseStatus !== 0 || entry.responseSnapshot !== null) {
      return { count: 0 };
    }
    this.entries.set(key, {
      ...entry,
      responseStatus: 200,
      responseSnapshot: params.result,
    });
    return { count: 1 };
  }

  async deletePendingEntry(params: { adminId: string; scope: string; key: string; requestHash: string }) {
    const key = this.composeKey(params.adminId, params.scope, params.key);
    const entry = this.entries.get(key);
    if (!entry) {
      return { count: 0 };
    }
    if (entry.requestHash !== params.requestHash) {
      return { count: 0 };
    }
    if (entry.responseSnapshot !== null) {
      return { count: 0 };
    }
    this.entries.delete(key);
    return { count: 1 };
  }

  async deleteExpiredEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
  }) {
    const key = this.composeKey(params.adminId, params.scope, params.key);
    const entry = this.entries.get(key);
    if (!entry) {
      return { count: 0 };
    }
    if (entry.requestHash !== params.requestHash) {
      return { count: 0 };
    }
    if (entry.expiresAt.getTime() !== params.expiresAt.getTime()) {
      return { count: 0 };
    }
    this.entries.delete(key);
    return { count: 1 };
  }

  snapshot() {
    return new Map(this.entries);
  }

  restore(snapshot: Map<string, StoredEntry>) {
    this.entries.clear();
    for (const [key, entry] of snapshot.entries()) {
      this.entries.set(key, entry);
    }
  }

  private composeKey(adminId: string, scope: string, idempotencyKey: string) {
    return `${adminId}:${scope}:${idempotencyKey}`;
  }
}

describe(`AdminV2IdempotencyService`, () => {
  let service: AdminV2IdempotencyService;
  let repository: FakeAdminV2IdempotencyRepository;
  let transactions: PrismaTransactionRunner;
  let now: number;

  function makeOptions(overrides: Partial<AdminV2IdempotencyRuntimeOptions> = {}): AdminV2IdempotencyRuntimeOptions {
    return {
      entryTtlMs: 1_000,
      pollIntervalMs: 1,
      pollTimeoutMs: 0,
      now: () => now,
      sleep: async () => undefined,
      ...overrides,
    };
  }

  beforeEach(() => {
    now = new Date(`2026-04-17T12:00:00.000Z`).getTime();
    repository = new FakeAdminV2IdempotencyRepository();
    transactions = {
      run: async <T>(callback: (client: never) => Promise<T>): Promise<T> => {
        const snapshot = repository.snapshot();
        try {
          return await callback({} as never);
        } catch (error) {
          repository.restore(snapshot);
          throw error;
        }
      },
    } as unknown as PrismaTransactionRunner;
    service = new AdminV2IdempotencyService(repository, makeOptions(), transactions);
  });

  it(`resolves from the Nest container with the repository and options tokens`, async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminV2IdempotencyService,
        { provide: ADMIN_V2_IDEMPOTENCY_REPOSITORY, useValue: new FakeAdminV2IdempotencyRepository() },
        { provide: ADMIN_V2_IDEMPOTENCY_OPTIONS, useValue: makeOptions() },
        { provide: PrismaTransactionRunner, useValue: transactions },
      ],
    }).compile();

    expect(moduleRef.get(AdminV2IdempotencyService)).toBeInstanceOf(AdminV2IdempotencyService);
  });

  it(`returns the first result for repeated identical requests`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => ({ ok: true }));

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
    const execute = jest.fn<(...a: any[]) => any>(async () => ({ ok: true, status: `approved` }));

    const first = await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    const secondService = new AdminV2IdempotencyService(repository, makeOptions());
    const second = await secondService.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: jest.fn<(...a: any[]) => any>(async () => ({ ok: false })),
    });

    expect(first).toEqual({ ok: true, status: `approved` });
    expect(second).toEqual({ ok: true, status: `approved` });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`replays nested JSON object and array snapshots as the durable response contract`, async () => {
    const response = {
      ok: true,
      review: {
        steps: [`identity`, `risk`],
        outcomes: [{ code: `approved`, reasons: [`manual-review`] }],
      },
    };
    const execute = jest.fn<(...a: any[]) => any>(async () => response);

    await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    const secondService = new AdminV2IdempotencyService(repository, makeOptions());
    await expect(
      secondService.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { decision: `approve`, version: 1 },
        execute: jest.fn<(...a: any[]) => any>(async () => ({ ok: false })),
      }),
    ).resolves.toEqual(response);
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

  it(`hashes object payloads deterministically regardless of key order`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => ({ ok: true }));

    await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    await expect(
      service.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { version: 1, decision: `approve` },
        execute: async () => ({ ok: false }),
      }),
    ).resolves.toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`treats array order as part of the idempotency payload hash`, async () => {
    await service.execute({
      adminId: `admin-1`,
      scope: `document-bulk-tag`,
      key: `same-key`,
      payload: { ids: [`one`, `two`] },
      execute: async () => ({ ok: true }),
    });

    await expect(
      service.execute({
        adminId: `admin-1`,
        scope: `document-bulk-tag`,
        key: `same-key`,
        payload: { ids: [`two`, `one`] },
        execute: async () => ({ ok: false }),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`rejects a different payload while the same key is in flight`, async () => {
    let resolveFirst: (value: { ok: true }) => void = () => undefined;
    const first = service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
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

    resolveFirst({ ok: true });
    await expect(first).resolves.toEqual({ ok: true });
  });

  it(`cleans up an unfinished placeholder when execution fails`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => {
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

  it(`keeps the pending placeholder when snapshot persistence fails after execution`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => null);
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);

    try {
      await expect(
        service.execute({
          adminId: `admin-1`,
          scope: `verification:approve:consumer-1`,
          key: `same-key`,
          payload: { decision: `approve`, version: 1 },
          execute,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.execute({
          adminId: `admin-1`,
          scope: `verification:approve:consumer-1`,
          key: `same-key`,
          payload: { decision: `approve`, version: 1 },
          execute: async () => ({ ok: true }),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      loggerError.mockRestore();
    }

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`rolls back transactional placeholders when snapshot persistence fails`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => null);

    await expect(
      service.executeInTransaction({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { decision: `approve`, version: 1 },
        execute,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const retry = await service.executeInTransaction({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: async () => ({ ok: true }),
    });

    expect(retry).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`replays transactional responses without rerunning the callback`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => ({ ok: true, status: `approved` }));

    await service.executeInTransaction({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    const secondService = new AdminV2IdempotencyService(repository, makeOptions(), transactions);
    await expect(
      secondService.executeInTransaction({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { decision: `approve`, version: 1 },
        execute: jest.fn<(...a: any[]) => any>(async () => ({ ok: false })),
      }),
    ).resolves.toEqual({ ok: true, status: `approved` });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`rejects nested values that are not JSON serializable`, async () => {
    const loggerError = jest.spyOn(Logger.prototype, `error`).mockImplementation(() => undefined);

    try {
      await expect(
        service.execute({
          adminId: `admin-1`,
          scope: `verification:approve:consumer-1`,
          key: `same-key`,
          payload: { decision: `approve`, version: 1 },
          execute: async () => ({ ok: true, generatedAt: new Date(`2026-04-17T12:00:00.000Z`) }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      loggerError.mockRestore();
    }
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

  it(`rejects non-JSON idempotency payloads before creating placeholders`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => ({ ok: true }));

    await expect(
      service.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { generatedAt: new Date(`2026-04-17T12:00:00.000Z`) },
        execute,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it(`removes expired successful entries before reusing a key`, async () => {
    const execute = jest.fn<(...a: any[]) => any>(async () => ({ ok: true }));

    await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute,
    });

    now += 1_001;
    const retry = await service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: async () => ({ ok: true, retried: true }),
    });

    expect(retry).toEqual({ ok: true, retried: true });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it(`waits for a pending entry from another service instance and replays the result`, async () => {
    let resolveFirst: (value: { ok: true }) => void = () => undefined;
    const first = service.execute({
      adminId: `admin-1`,
      scope: `verification:approve:consumer-1`,
      key: `same-key`,
      payload: { decision: `approve`, version: 1 },
      execute: () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    });
    const secondService = new AdminV2IdempotencyService(
      repository,
      makeOptions({
        pollTimeoutMs: 10,
        sleep: async () => {
          resolveFirst({ ok: true });
          await first;
          now += 1;
        },
      }),
    );

    await expect(
      secondService.execute({
        adminId: `admin-1`,
        scope: `verification:approve:consumer-1`,
        key: `same-key`,
        payload: { decision: `approve`, version: 1 },
        execute: async () => ({ ok: false }),
      }),
    ).resolves.toEqual({ ok: true });
  });
});
