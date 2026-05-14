import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerPaymentsPolicyQuery } from './consumer-payments-policy.query';
import { type TransferBody } from './dto';
import { appendConsumerAppScopeToMetadata } from '../../../shared/payment-link-metadata';
import { PrismaService } from '../../../shared/prisma.service';
import { isConsumerProfileCompleteForVerification, isConsumerVerificationEffective } from '../../../shared-common';

@Injectable()
export class ConsumerPaymentsPoliciesService {
  private static readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyQuery: ConsumerPaymentsPolicyQuery,
  ) {}

  async ensureProfileComplete(consumerId: string) {
    const consumer = await this.policyQuery.findConsumerProfileForVerification(consumerId);
    if (!consumer) return;
    if (!isConsumerProfileCompleteForVerification(consumer)) {
      throw new BadRequestException(
        `Please complete your profile (Legal Status, Tax ID, Passport/ID number) ` +
          `before creating requests or sending payments.`,
      );
    }
  }

  async assertProfileCompleteForVerification(consumerId: string): Promise<void> {
    const consumer = await this.policyQuery.findConsumerProfileForVerification(consumerId);
    if (!consumer) return;
    if (!isConsumerProfileCompleteForVerification(consumer)) {
      throw new BadRequestException(errorCodes.PROFILE_INCOMPLETE_VERIFY);
    }
  }

  buildTransferRecipientWhere(body: TransferBody): Prisma.ConsumerModelWhereInput {
    const recipient = body.recipient?.trim();
    if (recipient) {
      return {
        OR: [{ email: { equals: recipient, mode: `insensitive` } }, { personalDetails: { phoneNumber: recipient } }],
        deletedAt: null,
      };
    }

    const legacyRecipientId = body.recipientId?.trim();
    if (!legacyRecipientId) {
      throw new NotFoundException(errorCodes.RECIPIENT_NOT_FOUND_TRANSFER);
    }

    const orConditions: Prisma.ConsumerModelWhereInput[] = [
      { email: { equals: legacyRecipientId, mode: `insensitive` } },
      { personalDetails: { phoneNumber: legacyRecipientId } },
    ];

    if (ConsumerPaymentsPoliciesService.uuidPattern.test(legacyRecipientId)) {
      orConditions.unshift({ id: legacyRecipientId });
    }

    return {
      OR: orConditions,
      deletedAt: null,
    };
  }

  async getKycLimits(
    consumerId: string,
    db: Pick<Prisma.TransactionClient, `consumerModel`> | Pick<PrismaService, `consumerModel`> = this.prisma,
  ) {
    const consumer = await this.policyQuery.findConsumerVerificationRecord(consumerId, db);

    const isVerified = consumer ? isConsumerVerificationEffective(consumer) : false;

    return {
      maxPerOperation: isVerified ? 10_000 : 1_000,
      dailyLimit: isVerified ? 50_000 : 5_000,
    };
  }

  async getTodayOutgoingTotal(
    consumerId: string,
    currencyCode: $Enums.CurrencyCode,
    db: Pick<Prisma.TransactionClient, `$queryRaw`> | Pick<PrismaService, `$queryRaw`> = this.prisma,
  ) {
    return this.policyQuery.getTodayOutgoingTotal(consumerId, currencyCode, db);
  }

  async ensureLimits(
    consumerId: string,
    amount: number,
    currencyCode: $Enums.CurrencyCode,
    db:
      | Pick<Prisma.TransactionClient, `consumerModel` | `$queryRaw`>
      | Pick<PrismaService, `consumerModel` | `$queryRaw`> = this.prisma,
  ) {
    const { maxPerOperation, dailyLimit } = await this.getKycLimits(consumerId, db);

    if (amount > maxPerOperation) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_PER_OPERATION_LIMIT);
    }

    const todayTotal = await this.getTodayOutgoingTotal(consumerId, currencyCode, db);
    if (todayTotal + amount > dailyLimit) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_DAILY_LIMIT);
    }
  }

  appendConsumerAppScopeMetadata(
    metadata: Prisma.JsonObject,
    consumerAppScope?: ConsumerAppScope,
  ): Prisma.InputJsonValue {
    return appendConsumerAppScopeToMetadata(metadata, consumerAppScope);
  }
}
