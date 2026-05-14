import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  invalidateActiveTokensByConsumerId(consumerId: string) {
    return this.prisma.resetPasswordModel.updateMany({
      where: { consumerId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  createToken(params: { consumerId: string; tokenHash: string; expiredAt: Date; appScope: ConsumerAppScope }) {
    return this.prisma.resetPasswordModel.create({
      data: params,
    });
  }

  findRecentTokenByConsumerId(consumerId: string, createdAtGte: Date) {
    return this.prisma.resetPasswordModel.findFirst({
      where: {
        consumerId,
        createdAt: { gte: createdAtGte },
      },
      select: { id: true },
    });
  }

  findLatestTokenByHash(tokenHash: string) {
    return this.prisma.resetPasswordModel.findFirst({
      where: { tokenHash },
      orderBy: { createdAt: `desc` },
      select: {
        appScope: true,
        deletedAt: true,
        expiredAt: true,
      },
    });
  }

  findActiveTokenByHash(tokenHash: string) {
    return this.prisma.resetPasswordModel.findFirst({
      where: { tokenHash, deletedAt: null, expiredAt: { gt: new Date() } },
    });
  }

  consumeToken(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    return db.resetPasswordModel.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
