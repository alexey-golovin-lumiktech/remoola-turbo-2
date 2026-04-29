import { DocumentsClient } from './DocumentsClient';
import { getContractDetails, getDocuments } from '../../../lib/consumer-api.server';

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
  const [documentsResponse, contract] = await Promise.all([
    getDocuments(page, pageSize, undefined, contactId ? { contactId } : undefined),
    contactId ? getContractDetails(contactId) : Promise.resolve(null),
  ]);
  const documents = documentsResponse?.items ?? [];

  return (
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
  );
}
