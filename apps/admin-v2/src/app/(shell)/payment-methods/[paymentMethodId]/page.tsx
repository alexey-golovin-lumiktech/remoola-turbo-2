import { notFound } from 'next/navigation';

import { loadPaymentMethodCasePage } from './page.loader';
import { derivePaymentMethodCasePagePermissions } from './page.permissions';
import { PaymentMethodCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function PaymentMethodCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentMethodId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { paymentMethodId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadPaymentMethodCasePage({ paymentMethodId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Payment method unavailable"
        description="Your admin identity can sign in, but it cannot access this payment-method surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Payment method unavailable"
        description="The payment-method case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = derivePaymentMethodCasePagePermissions(result.data.identity);
  return <PaymentMethodCasePageView data={result.data} permissions={permissions} />;
}
