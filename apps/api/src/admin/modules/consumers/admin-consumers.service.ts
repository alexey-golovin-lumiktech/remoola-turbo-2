import { BadRequestException, Injectable } from '@nestjs/common';

import { VerificationStatuses } from '@remoola/api-types';

import { VerificationAction, type ConsumerVerificationUpdateDto } from '../../../dtos/admin';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminConsumersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllConsumers() {
    return this.prisma.consumerModel.findMany({
      orderBy: { createdAt: `desc` },
    });
  }

  async getById(id: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id },
      include: {
        personalDetails: true,
        organizationDetails: true,
        addressDetails: true,
        googleProfileDetails: true,
        consumerResources: {
          include: {
            resource: true,
          },
        },
      },
    });
  }

  async updateVerification(id: string, payload: ConsumerVerificationUpdateDto) {
    const now = new Date();

    switch (payload.action) {
      case VerificationAction.APPROVE:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verified: true,
            legalVerified: true,
            verificationStatus: VerificationStatuses.APPROVED,
            verificationReason: payload.reason ?? null,
            verificationUpdatedAt: now,
          },
          include: {
            personalDetails: true,
            organizationDetails: true,
            addressDetails: true,
            googleProfileDetails: true,
            consumerResources: {
              include: { resource: true },
            },
          },
        });
      case VerificationAction.REJECT:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verified: false,
            legalVerified: false,
            verificationStatus: VerificationStatuses.REJECTED,
            verificationReason: payload.reason ?? null,
            verificationUpdatedAt: now,
          },
          include: {
            personalDetails: true,
            organizationDetails: true,
            addressDetails: true,
            googleProfileDetails: true,
            consumerResources: {
              include: { resource: true },
            },
          },
        });
      case VerificationAction.MORE_INFO:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verified: false,
            legalVerified: false,
            verificationStatus: VerificationStatuses.MORE_INFO,
            verificationReason: payload.reason ?? null,
            verificationUpdatedAt: now,
          },
          include: {
            personalDetails: true,
            organizationDetails: true,
            addressDetails: true,
            googleProfileDetails: true,
            consumerResources: {
              include: { resource: true },
            },
          },
        });
      case VerificationAction.FLAG:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verificationStatus: VerificationStatuses.FLAGGED,
            verificationReason: payload.reason ?? null,
            verificationUpdatedAt: now,
          },
          include: {
            personalDetails: true,
            organizationDetails: true,
            addressDetails: true,
            googleProfileDetails: true,
            consumerResources: {
              include: { resource: true },
            },
          },
        });
      default:
        throw new BadRequestException(`Unsupported verification action`);
    }
  }
}
