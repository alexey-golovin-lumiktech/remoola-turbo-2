import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import {
  type ConsumerPaymentsPolicyReadClient,
  ConsumerPaymentsPolicyRepository,
} from './consumer-payments-policy.repository';
import { type TransferBody } from './dto';
import { toMoneyDecimal, type MoneyDecimalInput } from '../../../shared/money-decimal.utils';
import { appendConsumerAppScopeToMetadata } from '../../../shared/payment-link-metadata';
import { isConsumerProfileCompleteForVerification, isConsumerVerificationEffective } from '../../../shared-common';

@Injectable()
export class ConsumerPaymentsPoliciesService {
  private static readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(private readonly policyQuery: ConsumerPaymentsPolicyRepository) {}

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

  async getKycLimits(consumerId: string, db?: Pick<ConsumerPaymentsPolicyReadClient, `consumerModel`>) {
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
    db?: Pick<ConsumerPaymentsPolicyReadClient, `$queryRaw`>,
  ) {
    return this.policyQuery.getTodayOutgoingTotal(consumerId, currencyCode, db);
  }

  async ensureLimits(
    consumerId: string,
    amount: MoneyDecimalInput,
    currencyCode: $Enums.CurrencyCode,
    db?: ConsumerPaymentsPolicyReadClient,
  ) {
    const { maxPerOperation, dailyLimit } = await this.getKycLimits(consumerId, db);
    const amountDecimal = toMoneyDecimal(amount, `payment amount`);

    if (amountDecimal.gt(maxPerOperation)) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_PER_OPERATION_LIMIT);
    }

    const todayTotal = await this.getTodayOutgoingTotal(consumerId, currencyCode, db);
    if (toMoneyDecimal(todayTotal, `today outgoing total`).plus(amountDecimal).gt(dailyLimit)) {
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
