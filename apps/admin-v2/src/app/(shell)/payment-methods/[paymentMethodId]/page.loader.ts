import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getPaymentMethodCaseResult } from '../../../../lib/admin-api/payments.server';
import { readReturnTo } from '../../../../lib/navigation-context';

type PaymentMethodCaseResult = Awaited<ReturnType<typeof getPaymentMethodCaseResult>>;
type PaymentMethodCaseReady = Extract<PaymentMethodCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;

export type PaymentMethodCasePageData = {
  identity: Identity;
  paymentMethod: PaymentMethodCaseReady[`data`];
  backToQueueHref: string;
  fingerprintHref: string | null;
};

type PaymentMethodCasePageLoadResult =
  | { status: `ready`; data: PaymentMethodCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadPaymentMethodCasePage({
  paymentMethodId,
  searchParams,
}: {
  paymentMethodId: string;
  searchParams: { from?: string } | undefined;
}): Promise<PaymentMethodCasePageLoadResult> {
  const [identity, paymentMethodResult] = await Promise.all([
    getAdminIdentity(),
    getPaymentMethodCaseResult(paymentMethodId),
  ]);

  if (paymentMethodResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (paymentMethodResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (paymentMethodResult.status === `error`) {
    return { status: `error` };
  }

  const paymentMethod = paymentMethodResult.data;
  const fingerprintHref = paymentMethod.stripeFingerprint
    ? `/payment-methods?fingerprint=${encodeURIComponent(paymentMethod.stripeFingerprint)}&includeDeleted=true`
    : null;
  const backToQueueHref = readReturnTo(searchParams?.from, `/payment-methods`);

  return {
    status: `ready`,
    data: { identity, paymentMethod, backToQueueHref, fingerprintHref },
  };
}
