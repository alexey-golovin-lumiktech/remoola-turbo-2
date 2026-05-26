import { Injectable, type Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../../../../shared/prisma-transaction.runner';
import { PrismaService } from '../../../../../shared/prisma.service';
import { createOutcomeIdempotent } from '../core/ledger-outcome-idempotent';

@Injectable()
export class StripeWebhookPayoutsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner = new PrismaTransactionRunner(prisma),
  ) {}

  async recordPayoutOutcome(params: {
    transactionId: string;
    externalId: string;
    status: $Enums.TransactionStatus;
    logger: Logger;
  }) {
    await this.transactions.runLedgerMutation(async (tx) => {
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
