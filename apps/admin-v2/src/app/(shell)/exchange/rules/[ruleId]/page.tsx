import { notFound } from 'next/navigation';

import { loadExchangeRuleCasePage } from './page.loader';
import { deriveExchangeRuleCasePagePermissions } from './page.permissions';
import { ExchangeRuleCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../../components/admin-surface-state';

export default async function ExchangeRuleCasePage({ params }: { params: Promise<{ ruleId: string }> }) {
  const { ruleId } = await params;
  const result = await loadExchangeRuleCasePage({ ruleId });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Exchange rule unavailable"
        description="Your admin identity can sign in, but it cannot access this exchange-rule surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Exchange rule unavailable"
        description="The exchange-rule case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveExchangeRuleCasePagePermissions(result.data.identity);
  return <ExchangeRuleCasePageView data={result.data} permissions={permissions} />;
}
