import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ConsumerIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  findAnyById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id },
    });
  }

  findActiveById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findActiveIdentitySummaryById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
      },
    });
  }

  findActiveRecoveryCandidateById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        password: true,
        salt: true,
      },
    });
  }

  findActiveRecoveryCandidateByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: {
        id: true,
        email: true,
        password: true,
        salt: true,
      },
    });
  }

  async updatePassword(id: string, password: string, salt: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    return db.consumerModel.update({
      where: { id },
      data: { password, salt },
    });
  }
}
