import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { StripeWebhookReversalNotificationRepository } from './stripe-webhook-reversal-notification.repository';
import { type StripeReversalEmailOutboxPayload } from './stripe-webhook-reversal-outbox';
import { MailingService } from '../../../shared/mailing.service';

@Injectable()
export class StripeWebhookReversalNotificationService {
  constructor(
    private readonly notificationRepository: StripeWebhookReversalNotificationRepository,
    private readonly mailingService: MailingService,
  ) {}

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
    const { paymentRequestId, payerId, requesterId, requesterEmail, amount, currencyCode, kind, reason } = params;
    const consumerAppScope = await this.notificationRepository.resolvePaymentLinkConsumerAppScope(paymentRequestId);
    const consumerIds = [payerId, ...(requesterId ? [requesterId] : [])];
    const consumers = await this.notificationRepository.findConsumerEmails(consumerIds);

    const payer = consumers.find((consumer) => consumer.id === payerId);
    const requester = requesterId ? consumers.find((consumer) => consumer.id === requesterId) : null;
    const requesterEmailResolved = requester?.email ?? requesterEmail ?? ``;

    if (!payer?.email) return;

    if (kind === `REFUND`) {
      await this.mailingService.sendPaymentRefundEmail({
        recipientEmail: payer.email,
        counterpartyEmail: requesterEmailResolved,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `payer`,
        consumerAppScope,
      });
      if (requesterEmailResolved) {
        await this.mailingService.sendPaymentRefundEmail({
          recipientEmail: requesterEmailResolved,
          counterpartyEmail: payer.email,
          amount,
          currencyCode,
          reason,
          paymentRequestId,
          role: `requester`,
          consumerAppScope,
        });
      }
      return;
    }

    await this.mailingService.sendPaymentChargebackEmail({
      recipientEmail: payer.email,
      counterpartyEmail: requesterEmailResolved,
      amount,
      currencyCode,
      reason,
      paymentRequestId,
      role: `payer`,
      consumerAppScope,
    });
    if (requesterEmailResolved) {
      await this.mailingService.sendPaymentChargebackEmail({
        recipientEmail: requesterEmailResolved,
        counterpartyEmail: payer.email,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `requester`,
        consumerAppScope,
      });
    }
  }

  async sendReversalEmail(payload: StripeReversalEmailOutboxPayload) {
    const consumerAppScope = await this.notificationRepository.resolvePaymentLinkConsumerAppScope(
      payload.paymentRequestId,
    );
    const consumerIds = [payload.payerId, ...(payload.requesterId ? [payload.requesterId] : [])];
    const consumers = await this.notificationRepository.findConsumerEmails(consumerIds);

    const payer = consumers.find((consumer) => consumer.id === payload.payerId);
    const requester = payload.requesterId ? consumers.find((consumer) => consumer.id === payload.requesterId) : null;
    const requesterEmailResolved = requester?.email ?? payload.requesterEmail ?? ``;
    const recipientEmail = payload.role === `payer` ? payer?.email : requesterEmailResolved;
    const counterpartyEmail = payload.role === `payer` ? requesterEmailResolved : payer?.email;

    if (!recipientEmail) {
      throw new Error(`Stripe reversal email recipient is missing`);
    }
    if (!counterpartyEmail) {
      throw new Error(`Stripe reversal email counterparty is missing`);
    }

    const params = {
      recipientEmail,
      counterpartyEmail,
      amount: payload.amount,
      currencyCode: payload.currencyCode,
      reason: payload.reason,
      paymentRequestId: payload.paymentRequestId,
      role: payload.role,
      consumerAppScope,
    };

    if (payload.kind === `REFUND`) {
      await this.mailingService.sendPaymentRefundEmailRequired(params);
      return;
    }

    await this.mailingService.sendPaymentChargebackEmailRequired(params);
  }
}
