import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

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
}
