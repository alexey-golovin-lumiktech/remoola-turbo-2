import Stripe from 'stripe';

type SavedMethodPaymentRequest = {
  id: string;
  amount: number | string | { toString(): string };
  currencyCode: string;
  requester?: { email?: string | null } | null;
  requesterEmail?: string | null;
};

export function isTransientStripeError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) return false;
  return (
    error.type === `StripeAPIError` ||
    error.type === `StripeConnectionError` ||
    error.type === `StripeRateLimitError` ||
    error.type === `StripeIdempotencyError`
  );
}

export function shouldAppendDeniedOutcome(error: unknown): boolean {
  if (error instanceof Stripe.errors.StripeError) {
    return error.type === `StripeCardError`;
  }
  if (typeof error === `object` && error != null && `type` in error) {
    return (error as { type?: unknown }).type === `StripeCardError`;
  }
  return false;
}

export function isNonReusableSavedMethodError(error: unknown): boolean {
  const stripeType = error instanceof Stripe.errors.StripeError ? error.type : null;
  const err = error as { type?: string; message?: string } | null | undefined;
  const normalizedType = (stripeType ?? err?.type ?? ``).toLowerCase();
  const normalizedMessage = (err?.message ?? ``).toLowerCase();

  if (!normalizedMessage) {
    return false;
  }

  const looksLikeInvalidRequest =
    normalizedType === `stripeinvalidrequesterror`.toLowerCase() || normalizedType === `invalid_request_error`;

  return (
    looksLikeInvalidRequest &&
    (normalizedMessage.includes(`previously used without being attached`) ||
      normalizedMessage.includes(`without customer attachment`) ||
      normalizedMessage.includes(`detached from a customer`) ||
      normalizedMessage.includes(`attach it to a customer first`))
  );
}

export function buildSavedMethodIdempotencyKey(paymentRequestId: string): string {
  return `saved-method:${paymentRequestId}`;
}

export function buildSavedMethodPaymentIntentCreateInput(params: {
  paymentRequest: SavedMethodPaymentRequest;
  amountMinor: number;
  customerId: string;
  stripePaymentMethodId: string;
  paymentMethodId: string;
  consumerId: string;
  clientIdempotencyKey: string;
}): Stripe.PaymentIntentCreateParams {
  const {
    paymentRequest,
    amountMinor,
    customerId,
    stripePaymentMethodId,
    paymentMethodId,
    consumerId,
    clientIdempotencyKey,
  } = params;

  return {
    amount: amountMinor,
    currency: paymentRequest.currencyCode.toLowerCase(),
    customer: customerId,
    payment_method: stripePaymentMethodId,
    confirm: true,
    off_session: true,
    metadata: {
      paymentRequestId: paymentRequest.id,
      consumerId,
      paymentMethodId,
      clientIdempotencyKey,
    },
    description: `Payment to ${paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? `recipient`}`,
  };
}

export function buildSavedMethodSuccessResult(paymentIntentId: string, status: string) {
  return {
    success: true as const,
    paymentIntentId,
    status,
  };
}

export function buildSavedMethodPendingResult(
  paymentIntentId: string,
  status: string,
  nextAction: Stripe.PaymentIntent[`next_action`],
) {
  return {
    success: false as const,
    paymentIntentId,
    status,
    nextAction,
  };
}
