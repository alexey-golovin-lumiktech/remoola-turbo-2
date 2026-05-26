import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../../shared/prisma-transaction.runner';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerProfileRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner = new PrismaTransactionRunner(prisma),
  ) {}

  async findPasswordCredentials(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { id: true, email: true, password: true, salt: true },
    });
  }

  async findProfileById(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: {
        personalDetails: true,
        addressDetails: true,
        organizationDetails: true,
      },
    });
  }

  async findPersonalDetails(consumerId: string) {
    return this.prisma.personalDetailsModel.findFirst({ where: { consumerId } });
  }

  async findAddressDetails(consumerId: string) {
    return this.prisma.addressDetailsModel.findFirst({ where: { consumerId } });
  }

  async findOrganizationDetails(consumerId: string) {
    return this.prisma.organizationDetailsModel.findFirst({ where: { consumerId } });
  }

  async updateProfile(consumerId: string, data: Record<string, unknown>) {
    return this.prisma.consumerModel.update({
      where: { id: consumerId },
      data: data as Prisma.ConsumerModelUpdateInput,
      include: {
        personalDetails: true,
        addressDetails: true,
        organizationDetails: true,
      },
    });
  }

  async persistPasswordAndRevokeSessions(consumerId: string, hash: string, salt: string) {
    await this.transactions.run(async (tx) => {
      await tx.consumerModel.update({
        where: { id: consumerId },
        data: { password: hash, salt },
      });
      await tx.authSessionModel.updateMany({
        where: { consumerId, revokedAt: null },
        data: { revokedAt: new Date(), invalidatedReason: `logout_all`, lastUsedAt: new Date() },
      });
    });
  }
}
