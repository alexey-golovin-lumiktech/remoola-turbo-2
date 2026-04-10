import { parseContractsSearchParams, type ContractsSearchParams } from './contracts-search-params';
import { ContractsClient } from './ContractsClient';
import { getContracts } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

export default async function ContractsPage({ searchParams }: { searchParams?: Promise<ContractsSearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { page, pageSize, query, status, hasDocuments, hasPayments, sort } =
    parseContractsSearchParams(resolvedSearchParams);
  const contractsResponse = await getContracts({ page, pageSize, query, status, hasDocuments, hasPayments, sort });
  const contracts = contractsResponse?.items ?? [];

  return (
    <div>
      <PageHeader title="Contracts" icon={<DocumentIcon className="h-10 w-10 text-white" />} />
      <ContractsClient
        contracts={contracts}
        total={contractsResponse?.total ?? contracts.length}
        page={contractsResponse?.page ?? page}
        pageSize={contractsResponse?.pageSize ?? pageSize}
        initialQuery={query}
        initialStatus={status}
        initialHasDocuments={hasDocuments}
        initialHasPayments={hasPayments}
        initialSort={sort}
      />
    </div>
  );
}
