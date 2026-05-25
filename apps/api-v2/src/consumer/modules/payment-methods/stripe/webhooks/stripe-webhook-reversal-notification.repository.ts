import { Injectable } from '@nestjs/common';

import { resolvePaymentLinkConsumerAppScopeFromLedgerHistory } from '../../../../../shared/payment-link-scope-resolver';
import { PrismaService } from '../../../../../shared/prisma.service';

@Injectable()
export class StripeWebhookReversalNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConsumerEmails(consumerIds: string[]) {
    return this.prisma.consumerModel.findMany({
      where: { id: { in: consumerIds } },
      select: { id: true, email: true },
    });
  }

  async resolvePaymentLinkConsumerAppScope(paymentRequestId: string) {
    return resolvePaymentLinkConsumerAppScopeFromLedgerHistory(this.prisma, paymentRequestId);
  }
}
