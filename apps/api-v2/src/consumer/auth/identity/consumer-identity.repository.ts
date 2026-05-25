import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSignupCollisionByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, deletedAt: true },
    });
  }

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

  findGoogleLoginCandidateByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { personalDetails: true },
    });
  }

  findGoogleLoginCandidateByEmailOrThrow(email: string) {
    return this.prisma.consumerModel.findFirstOrThrow({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { personalDetails: true },
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

  findActiveVerificationCandidateById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
      },
    });
  }

  findActiveVerificationDispatchTargetById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        verified: true,
      },
    });
  }

  findAnyVerificationDispatchTargetById(id: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id },
      select: {
        id: true,
        email: true,
        verified: true,
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

  updateGoogleLoginConsumer(id: string, data: Prisma.ConsumerModelUpdateInput) {
    return this.prisma.consumerModel.update({
      where: { id },
      data,
      include: { personalDetails: true },
    });
  }

  createGoogleLoginConsumer(data: Prisma.ConsumerModelCreateInput) {
    return this.prisma.consumerModel.create({
      data,
      include: { personalDetails: true },
    });
  }

  createSignupConsumer(data: Prisma.ConsumerModelCreateInput) {
    return this.prisma.consumerModel.create({
      data,
      include: { addressDetails: true, personalDetails: true, organizationDetails: true },
    });
  }

  markVerified(id: string) {
    return this.prisma.consumerModel.update({
      where: { id },
      data: { verified: true },
    });
  }
}
