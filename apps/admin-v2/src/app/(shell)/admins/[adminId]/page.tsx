import { notFound } from 'next/navigation';

import { loadAdminCasePage } from './page.loader';
import { deriveAdminCasePagePermissions } from './page.permissions';
import { AdminCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function AdminCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ adminId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { adminId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadAdminCasePage({ adminId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Admin case unavailable"
        description="Your admin identity can sign in, but it cannot access this admin surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Admin case unavailable"
        description="The admin case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveAdminCasePagePermissions(result.data.identity, result.data.admin);
  return <AdminCasePageView data={result.data} permissions={permissions} />;
}
