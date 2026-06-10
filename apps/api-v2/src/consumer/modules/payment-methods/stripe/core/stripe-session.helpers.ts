import { sanitizeNextForRedirect } from '@remoola/api-types';

import type Stripe from 'stripe';

export type StripeSessionRedirectContext = {
  contractId?: string | null;
  returnTo?: string | null;
};

type CheckoutSessionPaymentRequest = {
  id: string;
  amount: number | string | { toString(): string };
  currencyCode: string;
  requester?: { email?: string | null } | null;
  requesterEmail?: string | null;
};

function buildStripeSessionReturnUrl(
  frontendBaseUrl: string,
  paymentRequestId: string,
  outcome: `success` | `canceled`,
  context?: StripeSessionRedirectContext,
): string {
  const url = new URL(`${frontendBaseUrl}/payments/${paymentRequestId}`);
  const contractId = context?.contractId?.trim() ?? ``;
  const returnTo = sanitizeNextForRedirect(context?.returnTo, ``);

  if (contractId) {
    url.searchParams.set(`contractId`, contractId);
  }
  if (returnTo) {
    url.searchParams.set(`returnTo`, returnTo);
  } else if (contractId) {
    url.searchParams.set(`returnTo`, `/contracts/${contractId}`);
  }
  url.searchParams.set(outcome, `1`);

  return url.toString();
}

export function buildCheckoutSessionIdempotencyKey(paymentRequestId: string): string {
  return `checkout-session:${paymentRequestId}`;
}

export function buildEnsureCustomerIdempotencyKey(consumerId: string): string {
  return `ensure-customer:${consumerId}`;
}

export function buildCheckoutSessionCreateInput(params: {
  paymentRequest: CheckoutSessionPaymentRequest;
  customerId: string;
  amountMinor: number;
  consumerId: string;
  frontendBaseUrl: string;
  context?: StripeSessionRedirectContext;
}): Stripe.Checkout.SessionCreateParams {
  const { paymentRequest, customerId, amountMinor, consumerId, frontendBaseUrl, context } = params;

  return {
    payment_method_types: [`card`],
    mode: `payment`,
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: paymentRequest.currencyCode.toLowerCase(),
          product_data: {
            name: `Payment to ${paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? `recipient`}`,
          },
          unit_amount: amountMinor,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      setup_future_usage: `off_session`,
    },
    success_url: buildStripeSessionReturnUrl(frontendBaseUrl, paymentRequest.id, `success`, context),
    cancel_url: buildStripeSessionReturnUrl(frontendBaseUrl, paymentRequest.id, `canceled`, context),
    metadata: { paymentRequestId: paymentRequest.id, consumerId },
  };
}

export function buildSetupIntentCreateInput(customerId: string): Stripe.SetupIntentCreateParams {
  return {
    customer: customerId,
    usage: `off_session`,
    payment_method_types: [`card`],
  };
}
