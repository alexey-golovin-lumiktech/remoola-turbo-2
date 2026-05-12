import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { MailingService } from '../../../shared/mailing.service';

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
  constructor(private readonly mailingService: MailingService) {}

  async sendPaymentRequest(payload: PaymentRequestEmailPayload, consumerAppScope?: ConsumerAppScope) {
    if (!payload.payerEmail) return;
    await this.mailingService.sendPaymentRequestEmail({
      ...payload,
      consumerAppScope,
    });
  }
}
