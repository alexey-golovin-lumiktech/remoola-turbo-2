import { Inject, Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { PaymentMailingService } from '../../../shared/payment-mailing.service';

type PaymentRequestEmailer = Pick<PaymentMailingService, `sendPaymentRequestEmail`>;

type PaymentRequestEmailPayload = {
  payerEmail: string;
  requesterEmail: string;
  amount: number;
  currencyCode: $Enums.CurrencyCode;
  description?: string | null;
  dueDate?: Date | null;
  paymentRequestId: string;
};

@Injectable()
export class ConsumerPaymentRequestNotificationService {
  constructor(
    @Inject(PaymentMailingService)
    private readonly paymentMailingService: PaymentRequestEmailer,
  ) {}

  async sendPaymentRequest(payload: PaymentRequestEmailPayload, consumerAppScope?: ConsumerAppScope) {
    if (!payload.payerEmail) return;
    await this.paymentMailingService.sendPaymentRequestEmail({
      ...payload,
      consumerAppScope,
    });
  }
}
