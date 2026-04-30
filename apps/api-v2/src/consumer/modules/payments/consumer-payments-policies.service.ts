import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type TransferBody } from './dto';
import { buildWalletEligibilityCondition } from '../../../shared/balance-calculation.service';
import { appendConsumerAppScopeToMetadata } from '../../../shared/payment-link-metadata';
import { PrismaService } from '../../../shared/prisma.service';
import { isConsumerProfileCompleteForVerification, isConsumerVerificationEffective } from '../../../shared-common';

@Injectable()
export class ConsumerPaymentsPoliciesService {
  private static readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(private readonly prisma: PrismaService) {}

  async ensureProfileComplete(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
    if (!consumer) return;
    if (!isConsumerProfileCompleteForVerification(consumer)) {
      throw new BadRequestException(
        `Please complete your profile (Legal Status, Tax ID, Passport/ID number) ` +
          `before creating requests or sending payments.`,
      );
    }
  }

  async assertProfileCompleteForVerification(consumerId: string): Promise<void> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
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
    const consumer = await db.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        legalVerified: true,
        verificationStatus: true,
      },
    });

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
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await db.$queryRaw<Array<{ total: string | null }>>(Prisma.sql`
      SELECT COALESCE(SUM(le.amount), 0) AS total
      FROM ledger_entry le
      LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE le.consumer_id::text = ${consumerId}
        AND le.amount < 0
        AND le.currency_code::text = ${currencyCode}
        AND le.type::text IN (${Prisma.join(
          [$Enums.LedgerEntryType.USER_PAYMENT, $Enums.LedgerEntryType.USER_PAYOUT],
          `, `,
        )})
        AND le.created_at >= ${start}
        AND ((COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.PENDING}
             OR (COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.COMPLETED})
        AND le.deleted_at IS NULL
        ${walletEligibilityCondition}
    `);
    return Math.abs(Number(rows[0]?.total ?? 0));
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
