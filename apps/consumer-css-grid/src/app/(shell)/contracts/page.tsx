import { ContractsClient } from './ContractsClient';
import { getContracts } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

export default async function ContractsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(getSingleValue(resolvedSearchParams?.page)) || 1);
  const pageSize = Math.max(1, Number(getSingleValue(resolvedSearchParams?.pageSize)) || 10);
  const contractsResponse = await getContracts(page, pageSize);
  const contracts = contractsResponse?.items ?? [];

  return (
    <div>
      <PageHeader title="Contracts" icon={<DocumentIcon className="h-10 w-10 text-white" />} />
      <ContractsClient
        contracts={contracts}
        total={contractsResponse?.total ?? contracts.length}
        page={contractsResponse?.page ?? page}
        pageSize={contractsResponse?.pageSize ?? pageSize}
      />
    </div>
  );
}
