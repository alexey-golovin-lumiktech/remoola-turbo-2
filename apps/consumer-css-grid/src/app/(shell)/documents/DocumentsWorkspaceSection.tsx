import { DocumentsClient } from './DocumentsClient';
import { getContractDetails, getDocumentsResult } from '../../../lib/consumer-api.server';
import { WorkspaceUnavailableBanner } from '../../../shared/ui/shell-primitives';

export async function DocumentsWorkspaceSection({
  contactId,
  page,
  pageSize,
  returnTo,
}: {
  contactId: string;
  page: number;
  pageSize: number;
  returnTo: string | null;
}) {
  const [documentsResult, contract] = await Promise.all([
    getDocumentsResult(page, pageSize, undefined, contactId ? { contactId } : undefined),
    contactId ? getContractDetails(contactId) : Promise.resolve(null),
  ]);
  const documentsResponse = documentsResult.data;
  const documents = documentsResponse?.items ?? [];

  return (
    <>
      {documentsResult.unavailable ? (
        <WorkspaceUnavailableBanner
          title="Documents data is temporarily unavailable"
          text="The documents workspace could not load live document data from the backend right now. Upload and navigation controls remain available where possible."
        />
      ) : null}
      <DocumentsClient
        documents={documents}
        total={documentsResponse?.total ?? documents.length}
        page={documentsResponse?.page ?? page}
        pageSize={documentsResponse?.pageSize ?? pageSize}
        contractContext={
          contract
            ? {
                id: contract.id,
                name: contract.name?.trim() || contract.email || `Unknown contractor`,
                email: contract.email || ``,
                returnTo: returnTo || `/contracts/${contract.id}`,
                draftPaymentRequestIds: contract.payments
                  .filter((payment) => payment.status.toUpperCase() === `DRAFT`)
                  .map((payment) => payment.id),
              }
            : null
        }
      />
    </>
  );
}
