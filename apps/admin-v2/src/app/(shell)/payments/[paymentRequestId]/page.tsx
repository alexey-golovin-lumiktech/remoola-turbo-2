import { notFound } from 'next/navigation';

import { loadPaymentPage } from './page.loader';
import { derivePaymentPagePermissions } from './page.permissions';
import { PaymentCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function PaymentCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentRequestId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { paymentRequestId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadPaymentPage({ paymentRequestId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Payment case unavailable"
        description="Your admin identity can sign in, but it cannot access this payment surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Payment case unavailable"
        description="The payment case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = derivePaymentPagePermissions(result.data.identity, result.data.paymentCase);
  return <PaymentCasePageView data={result.data} permissions={permissions} />;
}
