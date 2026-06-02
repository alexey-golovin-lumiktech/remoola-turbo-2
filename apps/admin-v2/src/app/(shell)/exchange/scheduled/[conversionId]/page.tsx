import { notFound } from 'next/navigation';

import { loadExchangeScheduledCasePage } from './page.loader';
import { deriveExchangeScheduledCasePagePermissions } from './page.permissions';
import { ExchangeScheduledCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../../components/admin-surface-state';

export default async function ExchangeScheduledCasePage({ params }: { params: Promise<{ conversionId: string }> }) {
  const { conversionId } = await params;
  const result = await loadExchangeScheduledCasePage({ conversionId });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Scheduled conversion unavailable"
        description="Your admin identity can sign in, but it cannot access this scheduled-conversion surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Scheduled conversion unavailable"
        description="The scheduled conversion could not be loaded right now. Retry shortly."
      />
    );
  }

  const permissions = deriveExchangeScheduledCasePagePermissions(result.data.identity, result.data.conversion);
  return <ExchangeScheduledCasePageView data={result.data} permissions={permissions} />;
}
