import { Inject, Injectable } from '@nestjs/common';

import { type PaymentReversalStripeRefundPort } from './admin-v2-payment-reversal-refund-finalizer.ports';
import { STRIPE_CLIENT } from '../../shared/stripe-client';

@Injectable()
export class AdminV2PaymentReversalStripeRefundAdapter implements PaymentReversalStripeRefundPort {
  constructor(@Inject(STRIPE_CLIENT) private readonly stripe: PaymentReversalStripeRefundPort) {}

  get refunds(): PaymentReversalStripeRefundPort[`refunds`] {
    return this.stripe.refunds;
  }
}
