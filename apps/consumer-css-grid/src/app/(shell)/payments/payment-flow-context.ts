import { sanitizeNextForRedirect } from '@remoola/api-types';

type SearchValue = string | string[] | undefined;

export type PaymentFlowContext = {
  contractId?: string;
  returnTo?: string;
};

function getSingleValue(value: SearchValue) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

function sanitizePaymentReturnTo(raw: string | null | undefined): string {
  return sanitizeNextForRedirect(raw, ``);
}

function normalizePaymentFlowContext(context?: PaymentFlowContext | null): PaymentFlowContext | null {
  const contractId = context?.contractId?.trim() ?? ``;
  const returnTo = sanitizePaymentReturnTo(context?.returnTo);

  if (!contractId && !returnTo) {
    return null;
  }

  return {
    ...(contractId ? { contractId } : {}),
    ...(returnTo ? { returnTo } : contractId ? { returnTo: `/contracts/${contractId}` } : {}),
  };
}

export function parsePaymentFlowContext(input: {
  contractId?: SearchValue;
  returnTo?: SearchValue;
}): PaymentFlowContext | null {
  const contractId = getSingleValue(input.contractId).trim();
  const returnTo = sanitizePaymentReturnTo(getSingleValue(input.returnTo));

  if (!contractId && !returnTo) {
    return null;
  }

  return {
    ...(contractId ? { contractId } : {}),
    ...(returnTo ? { returnTo } : contractId ? { returnTo: `/contracts/${contractId}` } : {}),
  };
}

export function buildPaymentFlowSearchParams(context?: PaymentFlowContext | null) {
  const normalizedContext = normalizePaymentFlowContext(context);
  const params = new URLSearchParams();
  if (normalizedContext?.contractId) {
    params.set(`contractId`, normalizedContext.contractId);
  }
  if (normalizedContext?.returnTo) {
    params.set(`returnTo`, normalizedContext.returnTo);
  }
  return params;
}

export function buildPaymentEntryHref(
  pathname: `/payments/new-request` | `/payments/start`,
  input: PaymentFlowContext & { email?: string | null | undefined },
) {
  const params = buildPaymentFlowSearchParams(input);
  const email = input.email?.trim().toLowerCase();
  if (email) {
    params.set(`email`, email);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildPaymentDetailHref(paymentRequestId: string, context?: PaymentFlowContext | null) {
  const id = paymentRequestId.trim();
  const params = buildPaymentFlowSearchParams(context);
  const query = params.toString();
  return query ? `/payments/${id}?${query}` : `/payments/${id}`;
}

export function buildPaymentDocumentsHref(context?: PaymentFlowContext | null) {
  const normalizedContext = normalizePaymentFlowContext(context);
  if (!normalizedContext?.contractId) {
    return `/documents`;
  }

  const params = new URLSearchParams({ contactId: normalizedContext.contractId });
  if (normalizedContext.returnTo) {
    params.set(`returnTo`, normalizedContext.returnTo);
  }
  return `/documents?${params.toString()}`;
}

export function getPaymentFlowBackHref(context?: PaymentFlowContext | null) {
  return normalizePaymentFlowContext(context)?.returnTo || `/payments`;
}

export function getStartPaymentResultHref(
  paymentRequestId: string | null | undefined,
  context?: PaymentFlowContext | null,
) {
  const id = paymentRequestId?.trim();
  if (id) {
    return buildPaymentDetailHref(id, context);
  }

  return normalizePaymentFlowContext(context)?.contractId
    ? getPaymentFlowBackHref(context)
    : `/payments?role=PAYER&status=PENDING`;
}
