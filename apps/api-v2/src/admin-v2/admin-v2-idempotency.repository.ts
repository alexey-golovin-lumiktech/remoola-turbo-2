import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { type AdminV2IdempotencySnapshot } from './admin-v2-idempotency-json.utils';
import { PrismaService } from '../shared/prisma.service';

const PENDING_RESPONSE_STATUS = 0;
const SUCCEEDED_RESPONSE_STATUS = 200;

export type AdminV2PersistedIdempotencyEntry = {
  requestHash: string;
  responseSnapshot: AdminV2IdempotencySnapshot | null;
  expiresAt: Date;
  state: `pending` | `succeeded`;
};

type AdminV2IdempotencyClient = Pick<Prisma.TransactionClient, `adminActionIdempotencyModel`>;

export type AdminV2IdempotencyRepositoryPort = {
  findEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    client?: AdminV2IdempotencyClient;
  }): Promise<AdminV2PersistedIdempotencyEntry | null>;
  createPendingEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
    client?: AdminV2IdempotencyClient;
  }): Promise<unknown>;
  storeSuccess(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    result: AdminV2IdempotencySnapshot;
    client?: AdminV2IdempotencyClient;
  }): Promise<{ count: number }>;
  deletePendingEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    client?: AdminV2IdempotencyClient;
  }): Promise<{ count: number }>;
  deleteExpiredEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
    client?: AdminV2IdempotencyClient;
  }): Promise<{ count: number }>;
};

export const ADMIN_V2_IDEMPOTENCY_REPOSITORY = Symbol(`ADMIN_V2_IDEMPOTENCY_REPOSITORY`);

@Injectable()
export class AdminV2IdempotencyRepository implements AdminV2IdempotencyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private client(client?: AdminV2IdempotencyClient): AdminV2IdempotencyClient {
    return client ?? this.prisma;
  }

  async findEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    client?: AdminV2IdempotencyClient;
  }): Promise<AdminV2PersistedIdempotencyEntry | null> {
    const entry = await this.client(params.client).adminActionIdempotencyModel.findUnique({
      where: {
        adminId_scope_idempotencyKey: {
          adminId: params.adminId,
          scope: params.scope,
          idempotencyKey: params.key,
        },
      },
      select: {
        requestHash: true,
        responseStatus: true,
        responseSnapshot: true,
        expiresAt: true,
      },
    });
    if (!entry) {
      return null;
    }

    const pending = entry.responseStatus === PENDING_RESPONSE_STATUS;
    return {
      requestHash: entry.requestHash,
      responseSnapshot: pending ? null : (entry.responseSnapshot as AdminV2IdempotencySnapshot),
      expiresAt: entry.expiresAt,
      state: pending ? `pending` : `succeeded`,
    };
  }

  createPendingEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
    client?: AdminV2IdempotencyClient;
  }) {
    return this.client(params.client).adminActionIdempotencyModel.create({
      data: {
        adminId: params.adminId,
        scope: params.scope,
        idempotencyKey: params.key,
        requestHash: params.requestHash,
        responseStatus: PENDING_RESPONSE_STATUS,
        responseSnapshot: Prisma.DbNull,
        expiresAt: params.expiresAt,
      },
    });
  }

  storeSuccess(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    result: AdminV2IdempotencySnapshot;
    client?: AdminV2IdempotencyClient;
  }) {
    return this.client(params.client).adminActionIdempotencyModel.updateMany({
      where: {
        adminId: params.adminId,
        scope: params.scope,
        idempotencyKey: params.key,
        requestHash: params.requestHash,
        responseStatus: PENDING_RESPONSE_STATUS,
        responseSnapshot: { equals: Prisma.DbNull },
      },
      data: {
        responseStatus: SUCCEEDED_RESPONSE_STATUS,
        responseSnapshot: params.result,
      },
    });
  }

  deletePendingEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    client?: AdminV2IdempotencyClient;
  }) {
    return this.client(params.client).adminActionIdempotencyModel.deleteMany({
      where: {
        adminId: params.adminId,
        scope: params.scope,
        idempotencyKey: params.key,
        requestHash: params.requestHash,
        responseStatus: PENDING_RESPONSE_STATUS,
        responseSnapshot: { equals: Prisma.DbNull },
      },
    });
  }

  deleteExpiredEntry(params: {
    adminId: string;
    scope: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
    client?: AdminV2IdempotencyClient;
  }) {
    return this.client(params.client).adminActionIdempotencyModel.deleteMany({
      where: {
        adminId: params.adminId,
        scope: params.scope,
        idempotencyKey: params.key,
        requestHash: params.requestHash,
        expiresAt: params.expiresAt,
      },
    });
  }
}
