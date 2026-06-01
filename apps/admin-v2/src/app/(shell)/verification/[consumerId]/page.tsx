import { notFound } from 'next/navigation';

import { loadVerificationCasePage } from './page.loader';
import { deriveVerificationCasePagePermissions } from './page.permissions';
import { VerificationCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function VerificationCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ consumerId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { consumerId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadVerificationCasePage({ consumerId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Verification case unavailable"
        description="Your admin identity can sign in, but it cannot access this verification surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Verification case unavailable"
        description="The verification case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveVerificationCasePagePermissions(result.data.identity, result.data.verificationCase);
  return <VerificationCasePageView data={result.data} permissions={permissions} />;
}
