import { notFound } from 'next/navigation';

import { loadLedgerEntryCasePage } from './page.loader';
import { deriveLedgerEntryCasePagePermissions } from './page.permissions';
import { LedgerEntryCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function LedgerEntryCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ ledgerEntryId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { ledgerEntryId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadLedgerEntryCasePage({ ledgerEntryId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Ledger case unavailable"
        description="Your admin identity can sign in, but it cannot access this ledger surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Ledger case unavailable"
        description="The ledger case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveLedgerEntryCasePagePermissions(result.data.identity, result.data.ledgerCase);
  return <LedgerEntryCasePageView data={result.data} permissions={permissions} />;
}
