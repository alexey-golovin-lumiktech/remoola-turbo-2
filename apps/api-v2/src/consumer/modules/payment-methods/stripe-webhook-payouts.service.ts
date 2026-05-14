import { Injectable, Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { StripeWebhookPayoutsRepository } from './stripe-webhook-payouts.repository';

@Injectable()
export class StripeWebhookPayoutsService {
  private readonly logger = new Logger(StripeWebhookPayoutsService.name);

  constructor(private readonly payoutsRepository: StripeWebhookPayoutsRepository) {}

  async handlePayoutPaid(transactionId: string, externalId: string) {
    return this.recordPayoutOutcome(transactionId, externalId, $Enums.TransactionStatus.COMPLETED);
  }

  async handlePayoutFailed(transactionId: string, externalId: string) {
    return this.recordPayoutOutcome(transactionId, externalId, $Enums.TransactionStatus.DENIED);
  }

  private async recordPayoutOutcome(transactionId: string, externalId: string, status: $Enums.TransactionStatus) {
    await this.payoutsRepository.recordPayoutOutcome({
      transactionId,
      externalId,
      status,
      logger: this.logger,
    });
  }
}
