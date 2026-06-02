import { notFound } from 'next/navigation';

import { loadExchangeRateCasePage } from './page.loader';
import { deriveExchangeRateCasePagePermissions } from './page.permissions';
import { ExchangeRateCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../../components/admin-surface-state';

export default async function ExchangeRateCasePage({ params }: { params: Promise<{ rateId: string }> }) {
  const { rateId } = await params;
  const result = await loadExchangeRateCasePage({ rateId });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Exchange rate unavailable"
        description="Your admin identity can sign in, but it cannot access this exchange-rate surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Exchange rate unavailable"
        description="The exchange-rate case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveExchangeRateCasePagePermissions(result.data.identity);
  return <ExchangeRateCasePageView data={result.data} permissions={permissions} />;
}
