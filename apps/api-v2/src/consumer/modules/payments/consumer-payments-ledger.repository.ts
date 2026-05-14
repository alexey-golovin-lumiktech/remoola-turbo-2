import { Injectable } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';

import {
  acquireTransactionAdvisoryLock,
  buildConsumerOutgoingBalanceLockName,
} from '../../../shared/prisma-advisory-locks';
import { PrismaService } from '../../../shared/prisma.service';

type LedgerTx = Pick<Prisma.TransactionClient, `$executeRaw` | `ledgerEntryModel`>;

@Injectable()
export class ConsumerPaymentsLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findExistingWithdrawByIdempotencyKey(consumerId: string, key: string) {
    return this.prisma.ledgerEntryModel.findFirst({
      where: {
        idempotencyKey: `withdraw:${key}`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        deletedAt: null,
      },
    });
  }

  findExistingTransferByIdempotencyKey(consumerId: string, key: string) {
    return this.prisma.ledgerEntryModel.findFirst({
      where: {
        idempotencyKey: `transfer:${key}:sender`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        deletedAt: null,
      },
      select: { ledgerId: true },
    });
  }

  async lockConsumerOutgoing(tx: Pick<Prisma.TransactionClient, `$executeRaw`>, consumerId: string): Promise<void> {
    await acquireTransactionAdvisoryLock(tx, buildConsumerOutgoingBalanceLockName(consumerId));
  }

  createWithdrawLedgerEntry(
    tx: LedgerTx,
    params: {
      ledgerId: string;
      consumerId: string;
      currencyCode: $Enums.CurrencyCode;
      amount: number;
      idempotencyKey: string;
      paymentMethodId?: string;
      note?: string;
    },
  ) {
    return tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: params.currencyCode,
        status: $Enums.TransactionStatus.PENDING,
        amount: -params.amount,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
        idempotencyKey: `withdraw:${params.idempotencyKey}`,
        metadata: {
          rail: $Enums.PaymentRail.BANK_TRANSFER,
          requesterId: params.consumerId,
          ...(params.paymentMethodId?.trim() ? { paymentMethodId: params.paymentMethodId.trim() } : {}),
          ...(params.note?.trim() ? { note: params.note.trim() } : {}),
        },
      },
    });
  }

  async createTransferLedgerEntries(
    tx: LedgerTx,
    params: {
      ledgerId: string;
      consumerId: string;
      recipientId: string;
      currencyCode: $Enums.CurrencyCode;
      amount: number;
      idempotencyKey: string;
    },
  ) {
    await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: params.currencyCode,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -params.amount,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
        idempotencyKey: `transfer:${params.idempotencyKey}:sender`,
        metadata: {
          rail: $Enums.PaymentRail.BANK_TRANSFER,
          senderId: params.consumerId,
          recipientId: params.recipientId,
        },
      },
    });

    await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.recipientId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: params.currencyCode,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: params.amount,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
        idempotencyKey: `transfer:${params.idempotencyKey}:recipient`,
        metadata: {
          rail: $Enums.PaymentRail.BANK_TRANSFER,
          senderId: params.consumerId,
          recipientId: params.recipientId,
        },
      },
    });
  }
}
