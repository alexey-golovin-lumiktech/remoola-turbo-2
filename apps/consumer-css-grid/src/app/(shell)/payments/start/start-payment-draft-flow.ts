import { buildPaymentFlowSearchParams, type PaymentFlowContext } from '../payment-flow-context';

export type StartPaymentDraft = {
  email: string;
  amount: string;
  currencyCode: string;
  description: string;
  method: `CREDIT_CARD` | `BANK_ACCOUNT`;
};

export const START_PAYMENT_DRAFT_STORAGE_KEY = `consumer-css-grid:start-payment-draft`;
export const START_PAYMENT_RESUME_PATH = `/payments/start?resumeStartPayment=1`;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function parseStoredStartPaymentDraft(raw: string | null, preferredCurrency: string): StartPaymentDraft | null {
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as Partial<StartPaymentDraft>;
    return {
      email: draft.email ?? ``,
      amount: draft.amount ?? ``,
      currencyCode: draft.currencyCode ?? (preferredCurrency || `USD`),
      description: draft.description ?? ``,
      method: draft.method === `BANK_ACCOUNT` ? `BANK_ACCOUNT` : `CREDIT_CARD`,
    };
  } catch {
    return null;
  }
}

export function buildStartPaymentResumePath(context?: PaymentFlowContext | null) {
  const params = buildPaymentFlowSearchParams(context);
  params.set(`resumeStartPayment`, `1`);
  return `/payments/start?${params.toString()}`;
}

export function buildUnknownRecipientContactsUrl(email: string, context?: PaymentFlowContext | null) {
  const params = new URLSearchParams({
    create: `1`,
    email,
    returnTo: buildStartPaymentResumePath(context),
  });
  return `/contacts?${params.toString()}`;
}

export function parseResumeStartPaymentFlag(value: string | string[] | undefined) {
  return typeof value === `string` ? value === `1` : Array.isArray(value) ? value[0] === `1` : false;
}
