import { Prisma } from '@remoola/database-2';

import {
  AUTH_SESSION_ROTATION_TRANSACTION_POLICY,
  DEFAULT_TRANSACTION_OPTIONS,
  LEDGER_TRANSACTION_POLICY,
  PRISMA_TRANSACTION_POLICIES,
  PrismaTransactionRunner,
} from './prisma-transaction.runner';
import { type PrismaService } from './prisma.service';

describe(`PrismaTransactionRunner`, () => {
  function buildRunner() {
    const tx = {};
    const prisma = {
      $transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)),
    };

    return {
      prisma,
      runner: new PrismaTransactionRunner(prisma as unknown as PrismaService),
      tx,
    };
  }

  it(`applies default transaction policy`, async () => {
    const { prisma, runner, tx } = buildRunner();
    const callback = jest.fn(async () => `ok`);

    await expect(runner.run(callback)).resolves.toBe(`ok`);

    expect(callback).toHaveBeenCalledWith(tx);
    expect(prisma.$transaction).toHaveBeenCalledWith(callback, DEFAULT_TRANSACTION_OPTIONS);
  });

  it(`allows callers to override the policy explicitly`, async () => {
    const { prisma, runner } = buildRunner();
    const callback = jest.fn(async () => `ok`);

    await runner.run(callback, { timeout: 30_000 });

    expect(prisma.$transaction).toHaveBeenCalledWith(callback, { ...DEFAULT_TRANSACTION_OPTIONS, timeout: 30_000 });
  });

  it(`publishes named policies for auth and ledger workflows`, () => {
    expect(AUTH_SESSION_ROTATION_TRANSACTION_POLICY.options).toEqual({
      maxWait: 1_000,
      timeout: 5_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
    expect(LEDGER_TRANSACTION_POLICY.options).toEqual({
      maxWait: 5_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(LEDGER_TRANSACTION_POLICY.retry).toEqual({ maxAttempts: 3, baseDelayMs: 25 });
    expect(PRISMA_TRANSACTION_POLICIES.default.options).toEqual(DEFAULT_TRANSACTION_OPTIONS);
  });

  it(`runs callbacks with explicit named policy options`, async () => {
    const { prisma, runner, tx } = buildRunner();
    const callback = jest.fn(async () => `ok`);

    await expect(runner.runLedgerMutation(callback)).resolves.toBe(`ok`);

    expect(callback).toHaveBeenCalledWith(tx);
    expect(prisma.$transaction).toHaveBeenCalledWith(callback, LEDGER_TRANSACTION_POLICY.options);
  });

  it(`retries policy transactions on Prisma P2034 conflicts`, async () => {
    const { prisma, runner } = buildRunner();
    const conflict = { code: `P2034` };
    const callback = jest.fn(async () => `ok`);
    prisma.$transaction.mockRejectedValueOnce(conflict).mockImplementationOnce(async (fn) => fn({}));

    await expect(
      runner.runWithPolicy(
        {
          name: `retry-test`,
          options: DEFAULT_TRANSACTION_OPTIONS,
          retry: { maxAttempts: 2, baseDelayMs: 0 },
        },
        callback,
      ),
    ).resolves.toBe(`ok`);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it(`does not retry non-conflict transaction errors`, async () => {
    const { prisma, runner } = buildRunner();
    const error = new Error(`boom`);
    const callback = jest.fn(async () => `ok`);
    prisma.$transaction.mockRejectedValueOnce(error);

    await expect(
      runner.runWithPolicy(
        {
          name: `retry-test`,
          options: DEFAULT_TRANSACTION_OPTIONS,
          retry: { maxAttempts: 2, baseDelayMs: 0 },
        },
        callback,
      ),
    ).rejects.toThrow(error);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
