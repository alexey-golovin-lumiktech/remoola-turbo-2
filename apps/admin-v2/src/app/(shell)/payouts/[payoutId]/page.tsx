import { notFound } from 'next/navigation';

import { loadPayoutCasePage } from './page.loader';
import { derivePayoutCasePagePermissions } from './page.permissions';
import { PayoutCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function PayoutCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ payoutId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { payoutId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadPayoutCasePage({ payoutId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Payout case unavailable"
        description="Your admin identity can sign in, but it cannot access this payout surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Payout case unavailable"
        description="The payout case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = derivePayoutCasePagePermissions(result.data.identity, result.data.payoutCase);
  return <PayoutCasePageView data={result.data} permissions={permissions} />;
}
