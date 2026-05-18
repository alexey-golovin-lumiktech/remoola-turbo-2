import { Inject, Injectable } from '@nestjs/common';

import { type TPaymentReversalKind } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentReversalPolicyProvider } from './admin-v2-payment-reversal-policy';
import { AdminV2PaymentReversalQuery } from './admin-v2-payment-reversal.query';
import { PaymentMailingService } from '../../shared/payment-mailing.service';

type PaymentReversalEmailer = Pick<PaymentMailingService, `sendPaymentRefundEmail` | `sendPaymentChargebackEmail`>;

@Injectable()
export class AdminV2PaymentReversalNotificationService {
  constructor(
    private readonly query: AdminV2PaymentReversalQuery,
    private readonly policyProvider: AdminV2PaymentReversalPolicyProvider,
    @Inject(PaymentMailingService)
    private readonly paymentMailingService: PaymentReversalEmailer,
  ) {}

  async sendReversalEmails(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string | null;
    amount: number;
    currencyCode: $Enums.CurrencyCode;
    kind: TPaymentReversalKind;
    reason?: string | null;
  }) {
    const { paymentRequestId, payerId, requesterId, requesterEmail, amount, currencyCode, kind, reason } = params;
    const notificationContext = await this.query.getNotificationContext({
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail,
    });
    if (!notificationContext.payerEmail) return;

    const policy = this.policyProvider.get(kind);
    await policy.sendEmail(this.paymentMailingService, {
      recipientEmail: notificationContext.payerEmail,
      counterpartyEmail: notificationContext.requesterEmailResolved,
      amount,
      currencyCode,
      reason,
      paymentRequestId,
      role: `payer`,
      consumerAppScope: notificationContext.consumerAppScope,
    });
    if (notificationContext.requesterEmailResolved) {
      await policy.sendEmail(this.paymentMailingService, {
        recipientEmail: notificationContext.requesterEmailResolved,
        counterpartyEmail: notificationContext.payerEmail,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `requester`,
        consumerAppScope: notificationContext.consumerAppScope,
      });
    }
  }
}
