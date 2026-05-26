import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from './prisma.service';

type PrismaTransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

type PrismaTransactionPolicy = {
  readonly name: string;
  readonly options: Required<PrismaTransactionOptions>;
  readonly retry?: {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
  };
};

const PRISMA_TRANSACTION_POLICIES = {
  default: {
    name: `default`,
    options: {
      maxWait: 2_000,
      timeout: 10_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  },
  authSessionRotation: {
    name: `authSessionRotation`,
    options: {
      maxWait: 1_000,
      timeout: 5_000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  },
  ledgerMutation: {
    name: `ledgerMutation`,
    options: {
      maxWait: 5_000,
      timeout: 20_000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 25,
    },
  },
} satisfies Record<string, PrismaTransactionPolicy>;

// Ledger mutations run at Serializable and retry P2034 write-conflict/deadlock aborts.
// Advisory locks still reduce contention and keep domain-level ordering explicit.
const LEDGER_TRANSACTION_POLICY = PRISMA_TRANSACTION_POLICIES.ledgerMutation;

const AUTH_SESSION_ROTATION_TRANSACTION_POLICY = PRISMA_TRANSACTION_POLICIES.authSessionRotation;

const DEFAULT_TRANSACTION_OPTIONS = PRISMA_TRANSACTION_POLICIES.default.options;

@Injectable()
export class PrismaTransactionRunner {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>, options?: PrismaTransactionOptions): Promise<T> {
    return this.prisma.$transaction(callback, { ...DEFAULT_TRANSACTION_OPTIONS, ...options });
  }

  runWithPolicy<T>(
    policy: PrismaTransactionPolicy,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: PrismaTransactionOptions,
  ): Promise<T> {
    return this.runPolicyAttempt(
      {
        ...policy,
        options: { ...policy.options, ...options },
      },
      callback,
    );
  }

  runAuthSessionRotation<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: PrismaTransactionOptions,
  ): Promise<T> {
    return this.runWithPolicy(AUTH_SESSION_ROTATION_TRANSACTION_POLICY, callback, options);
  }

  runLedgerMutation<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: PrismaTransactionOptions,
  ): Promise<T> {
    return this.runWithPolicy(LEDGER_TRANSACTION_POLICY, callback, options);
  }

  private async runPolicyAttempt<T>(
    policy: PrismaTransactionPolicy,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maxAttempts = policy.retry?.maxAttempts ?? 1;
    if (maxAttempts < 1) {
      throw new Error(`runPolicyAttempt: maxAttempts must be at least 1`);
    }
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await this.prisma.$transaction(callback, policy.options);
      } catch (error) {
        lastError = error;
        if (!policy.retry || !this.isRetryableTransactionConflict(error) || attempt >= maxAttempts) {
          throw error;
        }
        await this.sleep(this.getRetryDelayMs(policy.retry.baseDelayMs, attempt));
      }
    }

    throw lastError ?? new Error(`runPolicyAttempt: no attempts configured`);
  }

  private isRetryableTransactionConflict(error: unknown): boolean {
    if (error == null || typeof error !== `object`) {
      return false;
    }
    return (error as { code?: unknown }).code === `P2034`;
  }

  private getRetryDelayMs(baseDelayMs: number, attempt: number): number {
    return baseDelayMs * 2 ** Math.max(0, attempt - 1) + Math.floor(Math.random() * baseDelayMs);
  }

  private sleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}
