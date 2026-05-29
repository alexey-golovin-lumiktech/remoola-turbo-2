import { notFound } from 'next/navigation';

import { loadConsumerPage } from './page.loader';
import { deriveConsumerPagePermissions } from './page.permissions';
import { ConsumerCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function ConsumerCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ consumerId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { consumerId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadConsumerPage({ consumerId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Consumer case unavailable"
        description="Your admin identity can sign in, but it cannot access this consumer surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Consumer case unavailable"
        description="The consumer case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveConsumerPagePermissions(result.data.identity, result.data.consumer);
  return <ConsumerCasePageView data={result.data} permissions={permissions} />;
}
