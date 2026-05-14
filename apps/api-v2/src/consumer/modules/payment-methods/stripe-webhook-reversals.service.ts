import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { StripeWebhookReversalNotificationService } from './stripe-webhook-reversal-notification.service';
import { StripeWebhookReversalsRepository } from './stripe-webhook-reversals.repository';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

import type Stripe from 'stripe';

@Injectable()
export class StripeWebhookReversalsService {
  private readonly logger = new Logger(StripeWebhookReversalsService.name);

  constructor(
    private readonly reversalsRepository: StripeWebhookReversalsRepository,
    private readonly reversalNotifications: StripeWebhookReversalNotificationService,
    private readonly balanceService: BalanceCalculationService,
    @Inject(CONSUMER_STRIPE_WEBHOOK_CLIENT) private readonly stripe: Stripe,
  ) {}

  async handleChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === `string` ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const paymentRequest = await this.reversalsRepository.resolvePaymentRequestByPaymentIntent(paymentIntentId);
    if (!paymentRequest) return;

    const requestAmount = Number(paymentRequest.amount);
    const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);

    for (const refund of charge.refunds?.data ?? []) {
      if (refund.status && refund.status !== `succeeded`) continue;
      const refundAmount = refund.amount / 10 ** digits;

      await this.createStripeReversal({
        paymentRequestId: paymentRequest.id,
        payerId: paymentRequest.payerId,
        requesterId: paymentRequest.requesterId,
        requesterEmail: paymentRequest.requesterEmail,
        currencyCode: paymentRequest.currencyCode,
        requestAmount,
        amount: refundAmount,
        kind: `REFUND`,
        stripeObjectId: refund.id,
        metadata: {
          stripeChargeId: charge.id,
          stripeRefundId: refund.id,
          stripePaymentIntentId: paymentIntentId,
          reason: refund.reason ?? null,
        },
      });
    }
  }

  async handleRefundUpdated(refund: Stripe.Refund) {
    const status =
      refund.status === `succeeded`
        ? $Enums.TransactionStatus.COMPLETED
        : refund.status === `failed` || refund.status === `canceled`
          ? $Enums.TransactionStatus.DENIED
          : $Enums.TransactionStatus.PENDING;

    await this.reversalsRepository.appendRefundUpdatedOutcome({
      refundId: refund.id,
      status,
      logger: this.logger,
    });
  }

  async handleChargeDispute(dispute: Stripe.Dispute) {
    if (!dispute.charge || typeof dispute.charge !== `string`) return;

    const charge = await this.stripe.charges.retrieve(dispute.charge);
    const paymentIntentId =
      typeof charge.payment_intent === `string` ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const paymentRequest = await this.reversalsRepository.resolvePaymentRequestByPaymentIntent(paymentIntentId);
    if (!paymentRequest) return;

    await this.recordDisputeStatus({
      paymentIntentId,
      dispute,
    });

    if (dispute.status !== `lost`) return;

    if (await this.reversalsRepository.hasManualChargebackReversal(paymentRequest.id)) return;

    const requestAmount = Number(paymentRequest.amount);
    const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);
    const disputeAmount = dispute.amount / 10 ** digits;

    await this.createStripeReversal({
      paymentRequestId: paymentRequest.id,
      payerId: paymentRequest.payerId,
      requesterId: paymentRequest.requesterId,
      requesterEmail: paymentRequest.requesterEmail,
      currencyCode: paymentRequest.currencyCode,
      requestAmount,
      amount: disputeAmount,
      kind: `CHARGEBACK`,
      stripeObjectId: dispute.id,
      metadata: {
        stripeChargeId: charge.id,
        stripeDisputeId: dispute.id,
        stripePaymentIntentId: paymentIntentId,
        reason: dispute.reason ?? null,
        disputeStatus: dispute.status,
      },
    });
  }

  async recordDisputeStatus(params: { paymentIntentId: string; dispute: Stripe.Dispute }) {
    const { paymentIntentId, dispute } = params;
    const ledgerEntryId = await this.reversalsRepository.resolveDisputeLedgerEntryIdByPaymentIntent(paymentIntentId);
    if (!ledgerEntryId) {
      return;
    }

    await this.reversalsRepository.createDisputeIfMissing({
      ledgerEntryId,
      stripeDisputeId: dispute.id,
      status: dispute.status,
      amount: dispute.amount,
      reason: dispute.reason ?? null,
    });
  }

  async createStripeReversal(params: {
    paymentRequestId: string;
    payerId: string | null;
    requesterId: string | null;
    requesterEmail?: string | null;
    currencyCode: $Enums.CurrencyCode;
    requestAmount: number;
    amount: number;
    kind: `REFUND` | `CHARGEBACK`;
    stripeObjectId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const {
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail,
      currencyCode,
      requestAmount,
      amount,
      kind,
      stripeObjectId,
      metadata = {},
    } = params;

    if (!payerId) return;

    await this.reversalsRepository.appendStripeReversal({
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail,
      currencyCode,
      requestAmount,
      amount,
      kind,
      stripeObjectId,
      metadata,
      logger: this.logger,
      assertRequesterBalance:
        requesterId && kind === `CHARGEBACK`
          ? async ({ tx, requesterId: requesterConsumerId, currencyCode: reversalCurrencyCode, finalAmount }) => {
              const requesterBalance = await this.balanceService.calculateInTransaction(
                tx,
                requesterConsumerId,
                reversalCurrencyCode,
                {
                  mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
                },
              );
              if (requesterBalance < finalAmount) {
                throw new ServiceUnavailableException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_STRIPE);
              }
            }
          : undefined,
    });
  }

  async sendReversalEmails(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string;
    amount: number;
    currencyCode: $Enums.CurrencyCode;
    kind: `REFUND` | `CHARGEBACK`;
    reason?: string | null;
  }) {
    return this.reversalNotifications.sendReversalEmails(params);
  }
}
