import { BadRequestException, Injectable } from '@nestjs/common';

import { VERIFICATION_ACTION, VERIFICATION_STATUS } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { type ConsumerVerificationUpdate } from '../../../dtos/admin';
import { PrismaService } from '../../../shared/prisma.service';

const SEARCH_MAX_LEN = 200;
const ACCOUNT_TYPES = Object.values($Enums.AccountType) as string[];
const VERIFICATION_STATUSES = Object.values($Enums.VerificationStatus) as string[];
const CONTRACTOR_KINDS = Object.values($Enums.ContractorKind) as string[];

@Injectable()
export class AdminConsumersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bounded list with search/filter (fintech-safe). */
  async findAllConsumers(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    accountType?: string;
    contractorKind?: string;
    verificationStatus?: string;
    verified?: string;
    includeDeleted?: boolean;
  }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 10, 1), 500);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const accountType =
      params?.accountType && ACCOUNT_TYPES.includes(params.accountType)
        ? (params.accountType as $Enums.AccountType)
        : undefined;
    const contractorKind =
      params?.contractorKind && CONTRACTOR_KINDS.includes(params.contractorKind)
        ? (params.contractorKind as $Enums.ContractorKind)
        : undefined;
    const verificationStatus =
      params?.verificationStatus && VERIFICATION_STATUSES.includes(params.verificationStatus)
        ? (params.verificationStatus as $Enums.VerificationStatus)
        : undefined;
    const verified = params?.verified === `true` ? true : params?.verified === `false` ? false : undefined;

    // contractorKind only applies to CONTRACTOR accounts (BUSINESS has contractorKind = null)
    const applyContractorKind =
      contractorKind && (accountType === undefined || accountType === $Enums.AccountType.CONTRACTOR);

    const where: Prisma.ConsumerModelWhereInput = {
      ...(params?.includeDeleted !== true && { deletedAt: null }),
      ...(accountType && { accountType }),
      ...(applyContractorKind && { contractorKind }),
      ...(verificationStatus && { verificationStatus }),
      ...(verified !== undefined && { verified }),
      ...(search && { email: { contains: search, mode: `insensitive` } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.consumerModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
      }),
      this.prisma.consumerModel.count({ where }),
    ]);

    return { items, total, page, pageSize };
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

  async updateVerification(id: string, payload: ConsumerVerificationUpdate) {
    const now = new Date();

    switch (payload.action) {
      case VERIFICATION_ACTION.APPROVE:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verified: true,
            legalVerified: true,
            verificationStatus: VERIFICATION_STATUS.APPROVED,
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
      case VERIFICATION_ACTION.REJECT:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verified: false,
            legalVerified: false,
            verificationStatus: VERIFICATION_STATUS.REJECTED,
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
      case VERIFICATION_ACTION.MORE_INFO:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verified: false,
            legalVerified: false,
            verificationStatus: VERIFICATION_STATUS.MORE_INFO,
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
      case VERIFICATION_ACTION.FLAG:
        return this.prisma.consumerModel.update({
          where: { id },
          data: {
            verificationStatus: VERIFICATION_STATUS.FLAGGED,
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
        throw new BadRequestException(adminErrorCodes.ADMIN_UNSUPPORTED_VERIFICATION_ACTION);
    }
  }
}
