import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type LockedSavedViewRow = {
  id: string;
  owner_id: string;
  workspace: string;
  name: string;
  deleted_at: Date | null;
};

function isUniqueViolation(error: unknown): boolean {
  if (error == null || typeof error !== `object`) return false;
  const candidate = error as { code?: string };
  return candidate.code === `P2002`;
}

@Injectable()
export class AdminV2SavedViewsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async create(params: {
    adminId: string;
    workspace: string;
    name: string;
    description: string | null;
    queryPayload: Prisma.InputJsonValue;
  }) {
    try {
      return await this.prisma.savedViewModel.create({
        data: {
          ownerId: params.adminId,
          workspace: params.workspace,
          name: params.name,
          description: params.description,
          queryPayload: params.queryPayload,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Saved view with this name already exists`);
      }
      throw error;
    }
  }

  async update(params: {
    savedViewId: string;
    adminId: string;
    hasName: boolean;
    nextName?: string;
    hasDescription: boolean;
    nextDescription?: string | null;
    hasPayload: boolean;
    queryPayload?: unknown;
  }) {
    return this.transactions.run(async (tx) => {
      const lockedRows = await tx.$queryRaw<LockedSavedViewRow[]>(Prisma.sql`
        SELECT "id", "owner_id", "workspace", "name", "deleted_at"
        FROM "saved_view"
        WHERE "id" = ${Prisma.sql`${params.savedViewId}::uuid`}
        FOR UPDATE
      `);
      const locked = lockedRows[0];
      if (!locked || locked.owner_id !== params.adminId) {
        throw new NotFoundException(`Saved view not found`);
      }
      if (locked.deleted_at) {
        throw new ConflictException(`Saved view is already deleted`);
      }

      try {
        const updated = await tx.savedViewModel.update({
          where: { id: params.savedViewId },
          data: {
            ...(params.hasName ? { name: params.nextName! } : {}),
            ...(params.hasDescription ? { description: params.nextDescription ?? null } : {}),
            ...(params.hasPayload ? { queryPayload: params.queryPayload as Prisma.InputJsonValue } : {}),
          },
        });

        return { previousName: locked.name, updated };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(`Saved view with this name already exists`);
        }
        throw error;
      }
    });
  }

  async softDelete(params: { savedViewId: string; adminId: string }) {
    return this.transactions.run(async (tx) => {
      const lockedRows = await tx.$queryRaw<LockedSavedViewRow[]>(Prisma.sql`
        SELECT "id", "owner_id", "workspace", "name", "deleted_at"
        FROM "saved_view"
        WHERE "id" = ${Prisma.sql`${params.savedViewId}::uuid`}
        FOR UPDATE
      `);
      const locked = lockedRows[0];
      if (!locked || locked.owner_id !== params.adminId) {
        throw new NotFoundException(`Saved view not found`);
      }
      if (locked.deleted_at) {
        throw new ConflictException(`Saved view is already deleted`);
      }

      const updated = await tx.savedViewModel.update({
        where: { id: params.savedViewId },
        data: { deletedAt: new Date() },
      });

      return { lockedName: locked.name, lockedWorkspace: locked.workspace, updated };
    });
  }
}
