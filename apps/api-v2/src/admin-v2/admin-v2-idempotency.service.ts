import { BadRequestException, ConflictException, Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';
import { sha256Hex } from '@remoola/security-utils';

import {
  isPlainJsonObject,
  stableStringifyJson,
  toIdempotencyResponseSnapshot,
} from './admin-v2-idempotency-json.utils';
import {
  ADMIN_V2_IDEMPOTENCY_OPTIONS,
  DEFAULT_ADMIN_V2_IDEMPOTENCY_OPTIONS,
  type AdminV2IdempotencyRuntimeOptions,
} from './admin-v2-idempotency.options';
import {
  ADMIN_V2_IDEMPOTENCY_REPOSITORY,
  type AdminV2IdempotencyRepositoryPort,
  type AdminV2PersistedIdempotencyEntry,
} from './admin-v2-idempotency.repository';
import { PrismaTransactionRunner } from '../shared/prisma-transaction.runner';

type IdempotentExecutionParams<T> = {
  adminId: string;
  scope: string;
  key?: string | null;
  payload: unknown;
  execute: () => Promise<T>;
};

type IdempotentTransactionalExecutionParams<T> = Omit<IdempotentExecutionParams<T>, `execute`> & {
  execute: (tx: Prisma.TransactionClient) => Promise<T>;
};

type InFlightEntry = {
  requestHash: string;
  promise: Promise<unknown>;
};

const MAX_KEY_LENGTH = 200;

@Injectable()
export class AdminV2IdempotencyService {
  private readonly logger = new Logger(AdminV2IdempotencyService.name);

  constructor(
    @Inject(ADMIN_V2_IDEMPOTENCY_REPOSITORY)
    private readonly repository: AdminV2IdempotencyRepositoryPort,
    @Inject(ADMIN_V2_IDEMPOTENCY_OPTIONS)
    private readonly options: AdminV2IdempotencyRuntimeOptions = DEFAULT_ADMIN_V2_IDEMPOTENCY_OPTIONS,
    @Optional()
    private readonly transactions?: PrismaTransactionRunner,
  ) {}

  private readonly entries = new Map<string, InFlightEntry>();

  async execute<T>(params: IdempotentExecutionParams<T>): Promise<T> {
    const key = this.normalizeKey(params.key);
    const entryKey = `${params.adminId}:${params.scope}:${key}`;
    const requestHash = sha256Hex(stableStringifyJson(params.payload));
    const persistedParams = { adminId: params.adminId, scope: params.scope, key, requestHash };

    return this.coalesce(entryKey, requestHash, () =>
      this.runWithPersistedIdempotency<T>(
        persistedParams,
        async () => {
          await this.repository.createPendingEntry({
            adminId: params.adminId,
            scope: params.scope,
            key,
            requestHash,
            expiresAt: new Date(this.options.now() + this.options.entryTtlMs),
          });
          return this.executeAndPersistResult({ ...persistedParams, execute: params.execute });
        },
        () => {
          throw new ConflictException(`Idempotent request is already in progress`);
        },
      ),
    );
  }

  async executeInTransaction<T>(params: IdempotentTransactionalExecutionParams<T>): Promise<T> {
    if (!this.transactions) {
      throw new Error(`PrismaTransactionRunner is required for transactional idempotency`);
    }
    const transactions = this.transactions;

    const key = this.normalizeKey(params.key);
    const entryKey = `${params.adminId}:${params.scope}:${key}`;
    const requestHash = sha256Hex(stableStringifyJson(params.payload));
    const persistedParams = { adminId: params.adminId, scope: params.scope, key, requestHash };

    return this.coalesce(entryKey, requestHash, () =>
      this.runWithPersistedIdempotency<T>(
        persistedParams,
        () =>
          transactions.run(async (tx) => {
            const transactionExisting = await this.repository.findEntry({
              adminId: params.adminId,
              scope: params.scope,
              key,
              client: tx,
            });
            if (transactionExisting) {
              if (transactionExisting.requestHash !== requestHash) {
                throw new ConflictException(`Idempotency key was already used with a different payload`);
              }
              if (transactionExisting.state === `succeeded`) {
                return this.replayStoredResponse<T>(transactionExisting);
              }
              throw new ConflictException(`Idempotent request is already in progress`);
            }

            await this.repository.createPendingEntry({
              adminId: params.adminId,
              scope: params.scope,
              key,
              requestHash,
              expiresAt: new Date(this.options.now() + this.options.entryTtlMs),
              client: tx,
            });

            const result = await params.execute(tx);
            const snapshot = toIdempotencyResponseSnapshot(result);
            const stored = await this.repository.storeSuccess({
              adminId: params.adminId,
              scope: params.scope,
              key,
              requestHash,
              result: snapshot,
              client: tx,
            });
            if (stored.count !== 1) {
              throw new ConflictException(`Idempotent request state changed before response persistence`);
            }
            return result;
          }),
        () => this.waitForStoredResponse<T>(persistedParams),
      ),
    );
  }

  private async coalesce<T>(entryKey: string, requestHash: string, run: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(entryKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(`Idempotency key was already used with a different payload`);
      }
      return (await existing.promise) as T;
    }

    const promise = run();
    this.entries.set(entryKey, { requestHash, promise });
    try {
      return (await promise) as T;
    } finally {
      this.entries.delete(entryKey);
    }
  }

  private async runWithPersistedIdempotency<T>(
    params: { adminId: string; scope: string; key: string; requestHash: string },
    runFresh: () => Promise<T>,
    onExhausted: () => T | Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const existing = await this.repository.findEntry({
        adminId: params.adminId,
        scope: params.scope,
        key: params.key,
      });
      if (existing) {
        const resolved = await this.resolveExistingEntry<T>(existing, params);
        if (resolved.terminal) {
          return resolved.value;
        }
        continue;
      }

      try {
        return await runFresh();
      } catch (error) {
        if (!this.isUniqueConstraint(error)) {
          throw error;
        }
      }
    }

    return await onExhausted();
  }

  private async resolveExistingEntry<T>(
    existing: AdminV2PersistedIdempotencyEntry,
    params: { adminId: string; scope: string; key: string; requestHash: string },
  ): Promise<{ terminal: true; value: T } | { terminal: false }> {
    if (existing.expiresAt.getTime() <= this.options.now()) {
      if (existing.state === `pending`) {
        throw new ConflictException(`Idempotent request is already in progress`);
      }
      await this.repository.deleteExpiredEntry({
        adminId: params.adminId,
        scope: params.scope,
        key: params.key,
        requestHash: existing.requestHash,
        expiresAt: existing.expiresAt,
      });
      return { terminal: false };
    }
    if (existing.requestHash !== params.requestHash) {
      throw new ConflictException(`Idempotency key was already used with a different payload`);
    }
    if (existing.state === `succeeded`) {
      this.logger.debug(`Replaying idempotent admin response`, {
        adminId: params.adminId,
        scope: params.scope,
      });
      return { terminal: true, value: this.replayStoredResponse<T>(existing) };
    }
    return { terminal: true, value: await this.waitForStoredResponse<T>(params) };
  }

  private normalizeKey(raw: string | null | undefined): string {
    const key = raw?.trim();
    if (!key) {
      throw new BadRequestException(`Idempotency-Key header is required`);
    }
    if (key.length > MAX_KEY_LENGTH) {
      throw new BadRequestException(`Idempotency-Key header is too long`);
    }
    return key;
  }

  private async executeAndPersistResult<T>(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    execute: () => Promise<T>;
  }): Promise<T> {
    let result: T;
    try {
      result = await params.execute();
    } catch (error) {
      await this.repository.deletePendingEntry({
        adminId: params.adminId,
        scope: params.scope,
        key: params.key,
        requestHash: params.requestHash,
      });
      throw error;
    }

    try {
      const snapshot = toIdempotencyResponseSnapshot(result);
      const stored = await this.repository.storeSuccess({
        adminId: params.adminId,
        scope: params.scope,
        key: params.key,
        requestHash: params.requestHash,
        result: snapshot,
      });
      if (stored.count !== 1) {
        throw new ConflictException(`Idempotent request state changed before response persistence`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to persist idempotent admin response after execution`, {
        adminId: params.adminId,
        scope: params.scope,
      });
      throw error;
    }
  }

  private async waitForStoredResponse<T>(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
  }): Promise<T> {
    const deadline = this.options.now() + this.options.pollTimeoutMs;
    while (this.options.now() < deadline) {
      await this.options.sleep(this.options.pollIntervalMs);
      const existing = await this.repository.findEntry({
        adminId: params.adminId,
        scope: params.scope,
        key: params.key,
      });
      if (!existing) {
        break;
      }
      if (existing.expiresAt.getTime() <= this.options.now()) {
        if (existing.state === `pending`) {
          break;
        }
        await this.repository.deleteExpiredEntry({
          adminId: params.adminId,
          scope: params.scope,
          key: params.key,
          requestHash: existing.requestHash,
          expiresAt: existing.expiresAt,
        });
        break;
      }
      if (existing.requestHash !== params.requestHash) {
        throw new ConflictException(`Idempotency key was already used with a different payload`);
      }
      if (existing.state === `succeeded`) {
        this.logger.debug(`Replaying idempotent admin response after wait`, {
          adminId: params.adminId,
          scope: params.scope,
        });
        return this.replayStoredResponse<T>(existing);
      }
    }

    this.logger.warn(`Timed out waiting for in-progress idempotent admin request`, {
      adminId: params.adminId,
      scope: params.scope,
    });
    throw new ConflictException(`Idempotent request is already in progress`);
  }

  private replayStoredResponse<T>(entry: AdminV2PersistedIdempotencyEntry): T {
    if (!isPlainJsonObject(entry.responseSnapshot)) {
      throw new ConflictException(`Persisted idempotency response is invalid`);
    }
    return entry.responseSnapshot as T;
  }

  private isUniqueConstraint(error: unknown): boolean {
    if (error == null || typeof error !== `object`) {
      return false;
    }
    const candidate = error as { code?: string };
    return candidate.code === `P2002`;
  }
}
