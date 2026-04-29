import { Injectable, Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeWebhookPayoutsService {
  private readonly logger = new Logger(StripeWebhookPayoutsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handlePayoutPaid(transactionId: string, externalId: string) {
    return this.recordPayoutOutcome(transactionId, externalId, $Enums.TransactionStatus.COMPLETED);
  }

  async handlePayoutFailed(transactionId: string, externalId: string) {
    return this.recordPayoutOutcome(transactionId, externalId, $Enums.TransactionStatus.DENIED);
  }

  private async recordPayoutOutcome(transactionId: string, externalId: string, status: $Enums.TransactionStatus) {
    await this.prisma.$transaction(async (tx) => {
      await createOutcomeIdempotent(
        tx,
        {
          ledgerEntryId: transactionId,
          status,
          source: `stripe`,
          externalId,
        },
        this.logger,
      );
    });
  }
}
