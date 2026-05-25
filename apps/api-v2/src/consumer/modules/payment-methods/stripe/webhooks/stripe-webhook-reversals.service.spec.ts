import { ServiceUnavailableException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { type StripeWebhookReversalNotificationService } from './stripe-webhook-reversal-notification.service';
import { type StripeWebhookReversalsRepository } from './stripe-webhook-reversals.repository';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { BalanceCalculationMode } from '../../../../../shared/balance-calculation.service';

import type Stripe from 'stripe';

describe(`StripeWebhookReversalsService`, () => {
  function makeService(overrides?: {
    repository?: Partial<jest.Mocked<StripeWebhookReversalsRepository>>;
    notificationService?: Partial<jest.Mocked<StripeWebhookReversalNotificationService>>;
    balanceService?: { calculateInTransaction?: jest.Mock };
    stripe?: Partial<Stripe>;
  }) {
    const repository = {
      appendRefundUpdatedOutcome: jest.fn().mockResolvedValue(undefined),
      appendStripeReversal: jest.fn().mockResolvedValue(25),
      createDisputeIfMissing: jest.fn().mockResolvedValue(undefined),
      hasManualChargebackReversal: jest.fn().mockResolvedValue(false),
      resolveDisputeLedgerEntryIdByPaymentIntent: jest.fn().mockResolvedValue(`ledger-1`),
      resolvePaymentRequestByPaymentIntent: jest.fn().mockResolvedValue({
        id: `pr-1`,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
      }),
      ...overrides?.repository,
    } as unknown as jest.Mocked<StripeWebhookReversalsRepository>;

    const notificationService = {
      sendReversalEmails: jest.fn().mockResolvedValue(undefined),
      ...overrides?.notificationService,
    } as unknown as jest.Mocked<StripeWebhookReversalNotificationService>;

    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
      ...overrides?.balanceService,
    };

    const stripe = {
      charges: {
        retrieve: jest.fn().mockResolvedValue({
          id: `ch_1`,
          payment_intent: `pi_1`,
        }),
      },
      ...overrides?.stripe,
    } as unknown as Stripe;

    return {
      repository,
      notificationService,
      balanceService,
      stripe,
      service: new StripeWebhookReversalsService(repository, notificationService, balanceService as any, stripe),
    };
  }

  it(`maps canceled refunds to denied outcomes and delegates persistence to the repository`, async () => {
    const { service, repository } = makeService();

    await service.handleRefundUpdated({ id: `re_1`, status: `canceled` } as Stripe.Refund);

    expect(repository.appendRefundUpdatedOutcome).toHaveBeenCalledWith({
      refundId: `re_1`,
      status: $Enums.TransactionStatus.DENIED,
      logger: expect.anything(),
    });
  });

  it(`skips dispute persistence when the payment intent does not resolve to a ledger entry`, async () => {
    const { service, repository } = makeService({
      repository: {
        resolveDisputeLedgerEntryIdByPaymentIntent: jest.fn().mockResolvedValue(null),
      },
    });

    await service.recordDisputeStatus({
      paymentIntentId: `pi_missing`,
      dispute: { id: `dp_1`, status: `won`, amount: 1200, reason: `fraudulent` } as Stripe.Dispute,
    });

    expect(repository.createDisputeIfMissing).not.toHaveBeenCalled();
  });

  it(`delegates dispute creation payload to the repository once the ledger entry is resolved`, async () => {
    const { service, repository } = makeService();

    await service.recordDisputeStatus({
      paymentIntentId: `pi_1`,
      dispute: { id: `dp_1`, status: `needs_response`, amount: 1200, reason: `fraudulent` } as Stripe.Dispute,
    });

    expect(repository.createDisputeIfMissing).toHaveBeenCalledWith({
      ledgerEntryId: `ledger-1`,
      stripeDisputeId: `dp_1`,
      status: `needs_response`,
      amount: 1200,
      reason: `fraudulent`,
    });
  });

  it(`skips automatic chargeback reversals when a manual admin chargeback already exists`, async () => {
    const { service, repository, stripe } = makeService({
      repository: {
        hasManualChargebackReversal: jest.fn().mockResolvedValue(true),
      },
    });

    await service.handleChargeDispute({
      id: `dp_manual`,
      charge: `ch_1`,
      amount: 2500,
      status: `lost`,
      reason: `fraudulent`,
    } as Stripe.Dispute);

    expect(stripe.charges.retrieve as jest.Mock).toHaveBeenCalledWith(`ch_1`);
    expect(repository.appendStripeReversal).not.toHaveBeenCalled();
  });

  it(`keeps chargeback balance policy in the service via repository callback`, async () => {
    const { service, repository, balanceService } = makeService({
      repository: {
        appendStripeReversal: jest.fn().mockImplementation(async (params) => {
          await params.assertRequesterBalance?.({
            tx: {} as any,
            requesterId: `requester-1`,
            currencyCode: $Enums.CurrencyCode.USD,
            finalAmount: 25,
          });
          return 25;
        }),
      },
      balanceService: {
        calculateInTransaction: jest.fn().mockResolvedValue(100),
      },
    });

    await service.createStripeReversal({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      requestAmount: 25,
      amount: 25,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `CHARGEBACK`,
      stripeObjectId: `dp_1`,
    });

    expect(repository.appendStripeReversal).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentRequestId: `pr-1`,
        kind: `CHARGEBACK`,
        assertRequesterBalance: expect.any(Function),
      }),
    );
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      `requester-1`,
      $Enums.CurrencyCode.USD,
      { mode: BalanceCalculationMode.COMPLETED_AND_PENDING },
    );
  });

  it(`raises insufficient balance when the chargeback callback sees too little requester balance`, async () => {
    const { service, repository } = makeService({
      repository: {
        appendStripeReversal: jest.fn().mockImplementation(async (params) => {
          await params.assertRequesterBalance?.({
            tx: {} as any,
            requesterId: `requester-1`,
            currencyCode: $Enums.CurrencyCode.USD,
            finalAmount: 25,
          });
        }),
      },
      balanceService: {
        calculateInTransaction: jest.fn().mockResolvedValue(10),
      },
    });

    await expect(
      service.createStripeReversal({
        paymentRequestId: `pr-1`,
        payerId: `payer-1`,
        requesterId: `requester-1`,
        requesterEmail: `requester@example.com`,
        requestAmount: 25,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
        kind: `CHARGEBACK`,
        stripeObjectId: `dp_1`,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
