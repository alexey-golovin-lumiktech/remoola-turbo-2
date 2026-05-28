import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { type StripeWebhookPayoutsRepository } from './stripe-webhook-payouts.repository';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';

describe(`StripeWebhookPayoutsService`, () => {
  function createRepositoryMock() {
    return {
      recordPayoutOutcome: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookPayoutsRepository>;
  }

  it(`records paid payouts as completed outcomes`, async () => {
    const payoutsRepository = createRepositoryMock();
    const service = new StripeWebhookPayoutsService(payoutsRepository);

    await service.handlePayoutPaid(`ledger-entry-1`, `po_paid`);

    expect(payoutsRepository.recordPayoutOutcome).toHaveBeenCalledWith({
      transactionId: `ledger-entry-1`,
      externalId: `po_paid`,
      status: $Enums.TransactionStatus.COMPLETED,
      logger: expect.anything(),
    });
  });

  it(`records failed payouts as denied outcomes`, async () => {
    const payoutsRepository = createRepositoryMock();
    const service = new StripeWebhookPayoutsService(payoutsRepository);

    await service.handlePayoutFailed(`ledger-entry-2`, `po_failed`);

    expect(payoutsRepository.recordPayoutOutcome).toHaveBeenCalledWith({
      transactionId: `ledger-entry-2`,
      externalId: `po_failed`,
      status: $Enums.TransactionStatus.DENIED,
      logger: expect.anything(),
    });
  });
});
