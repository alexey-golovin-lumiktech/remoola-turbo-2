import { getContractDetails } from '../../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../../shared/ui/icons/DocumentIcon';
import { PageHeader } from '../../../../shared/ui/shell-primitives';
import { ContractDetailView } from '../ContractDetailView';

type ContractDetailPageSearchParams = {
  returnTo?: string | string[];
};

function getSafeContractsReturnTo(value: string | string[] | undefined) {
  const rawValue = typeof value === `string` ? value : Array.isArray(value) ? value[0] : undefined;
  if (!rawValue) return null;
  if (!rawValue.startsWith(`/contracts`)) return null;
  if (rawValue.startsWith(`//`)) return null;
  return rawValue;
}

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contractId: string }>;
  searchParams?: Promise<ContractDetailPageSearchParams>;
}) {
  const { contractId: rawContractId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const contractId = rawContractId?.trim() ?? ``;
  const contract = contractId ? await getContractDetails(contractId) : null;
  const returnToContractsHref = getSafeContractsReturnTo(resolvedSearchParams?.returnTo) ?? `/contracts`;

  return (
    <div>
      <PageHeader title="Contract details" icon={<DocumentIcon className="h-10 w-10 text-white" />} />
      <ContractDetailView contract={contract} contractId={contractId} returnToContractsHref={returnToContractsHref} />
    </div>
  );
}
