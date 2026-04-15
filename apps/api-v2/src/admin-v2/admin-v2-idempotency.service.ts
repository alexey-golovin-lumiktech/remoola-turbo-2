import { createHash } from 'crypto';

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma.service';

type IdempotentExecutionParams<T> = {
  adminId: string;
  scope: string;
  key?: string | null;
  payload: unknown;
  execute: () => Promise<T>;
};

type InFlightEntry = {
  requestHash: string;
  promise: Promise<unknown>;
};

const ENTRY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 200;
const POLL_INTERVAL_MS = 50;
const POLL_TIMEOUT_MS = 5_000;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(`,`)}]`;
  }
  if (value && typeof value === `object`) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(`,`)}}`;
  }
  return JSON.stringify(value);
}

@Injectable()
export class AdminV2IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly entries = new Map<string, InFlightEntry>();

  async execute<T>(params: IdempotentExecutionParams<T>): Promise<T> {
    const key = this.normalizeKey(params.key);
    const entryKey = `${params.adminId}:${params.scope}:${key}`;
    const requestHash = createHash(`sha256`).update(stableStringify(params.payload)).digest(`hex`);
    const existing = this.entries.get(entryKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(`Idempotency key was already used with a different payload`);
      }
      return (await existing.promise) as T;
    }

    const promise = this.executePersisted({
      adminId: params.adminId,
      scope: params.scope,
      key,
      requestHash,
      execute: params.execute,
    });

    this.entries.set(entryKey, {
      requestHash,
      promise,
    });

    try {
      return (await promise) as T;
    } finally {
      this.entries.delete(entryKey);
    }
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

  private async executePersisted<T>(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    execute: () => Promise<T>;
  }): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const existing = await this.getExistingEntry(params.adminId, params.scope, params.key);
      if (existing) {
        if (existing.expiresAt.getTime() <= Date.now()) {
          await this.deleteExpiredEntry(params.adminId, params.scope, params.key, existing.expiresAt);
          continue;
        }
        if (existing.requestHash !== params.requestHash) {
          throw new ConflictException(`Idempotency key was already used with a different payload`);
        }
        if (existing.responseSnapshot != null) {
          return existing.responseSnapshot as T;
        }
        return this.waitForStoredResponse<T>({
          adminId: params.adminId,
          scope: params.scope,
          key: params.key,
          requestHash: params.requestHash,
        });
      }

      try {
        await this.prisma.adminActionIdempotencyModel.create({
          data: {
            adminId: params.adminId,
            scope: params.scope,
            idempotencyKey: params.key,
            requestHash: params.requestHash,
            responseStatus: 0,
            responseSnapshot: null,
            expiresAt: new Date(Date.now() + ENTRY_TTL_MS),
          },
        });
        return await this.executeAndPersistResult(params);
      } catch (error) {
        if (!this.isUniqueConstraint(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException(`Idempotent request is already in progress`);
  }

  private async executeAndPersistResult<T>(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    execute: () => Promise<T>;
  }): Promise<T> {
    try {
      const result = await params.execute();
      await this.prisma.adminActionIdempotencyModel.update({
        where: {
          adminId_scope_idempotencyKey: {
            adminId: params.adminId,
            scope: params.scope,
            idempotencyKey: params.key,
          },
        },
        data: {
          responseStatus: 200,
          responseSnapshot: result as object,
        },
      });
      return result;
    } catch (error) {
      await this.prisma.adminActionIdempotencyModel.deleteMany({
        where: {
          adminId: params.adminId,
          scope: params.scope,
          idempotencyKey: params.key,
          requestHash: params.requestHash,
          responseSnapshot: null,
        },
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
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const existing = await this.getExistingEntry(params.adminId, params.scope, params.key);
      if (!existing) {
        break;
      }
      if (existing.expiresAt.getTime() <= Date.now()) {
        await this.deleteExpiredEntry(params.adminId, params.scope, params.key, existing.expiresAt);
        break;
      }
      if (existing.requestHash !== params.requestHash) {
        throw new ConflictException(`Idempotency key was already used with a different payload`);
      }
      if (existing.responseSnapshot != null) {
        return existing.responseSnapshot as T;
      }
    }

    throw new ConflictException(`Idempotent request is already in progress`);
  }

  private getExistingEntry(adminId: string, scope: string, key: string) {
    return this.prisma.adminActionIdempotencyModel.findUnique({
      where: {
        adminId_scope_idempotencyKey: {
          adminId,
          scope,
          idempotencyKey: key,
        },
      },
      select: {
        requestHash: true,
        responseSnapshot: true,
        expiresAt: true,
      },
    });
  }

  private async deleteExpiredEntry(adminId: string, scope: string, key: string, expiresAt: Date) {
    await this.prisma.adminActionIdempotencyModel.deleteMany({
      where: {
        adminId,
        scope,
        idempotencyKey: key,
        expiresAt,
      },
    });
  }

  private isUniqueConstraint(error: unknown): boolean {
    if (error == null || typeof error !== `object`) {
      return false;
    }
    const candidate = error as { code?: string };
    return candidate.code === `P2002`;
  }
}
