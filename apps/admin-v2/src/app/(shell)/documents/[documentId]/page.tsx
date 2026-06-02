import { notFound } from 'next/navigation';

import { loadDocumentCasePage } from './page.loader';
import { deriveDocumentCasePagePermissions } from './page.permissions';
import { DocumentCasePageView } from './page.view';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';

export default async function DocumentCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { documentId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await loadDocumentCasePage({ documentId, searchParams: resolvedSearchParams });

  if (result.status === `not_found`) {
    notFound();
  }
  if (result.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Document case unavailable"
        description="Your admin identity can sign in, but it cannot access this document surface."
      />
    );
  }
  if (result.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Document case unavailable"
        description="The document case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }

  const permissions = deriveDocumentCasePagePermissions(result.data.identity, result.data.documentCase);
  return <DocumentCasePageView data={result.data} permissions={permissions} />;
}
