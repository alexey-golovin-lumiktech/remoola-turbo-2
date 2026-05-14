import { Injectable, type Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class StripeWebhookPayoutsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordPayoutOutcome(params: {
    transactionId: string;
    externalId: string;
    status: $Enums.TransactionStatus;
    logger: Logger;
  }) {
    await this.prisma.$transaction(async (tx) => {
      await createOutcomeIdempotent(
        tx,
        {
          ledgerEntryId: params.transactionId,
          status: params.status,
          source: `stripe`,
          externalId: params.externalId,
        },
        params.logger,
      );
    });
  }
}
