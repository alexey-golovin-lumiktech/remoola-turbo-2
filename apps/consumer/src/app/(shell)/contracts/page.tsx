import ContractsTable from '../../../components/contracts/ContractsTable';
import { getContracts } from '../../../lib/contracts';
import { type ConsumerContractItem } from '../../../types';

export default async function ContractsPage() {
  // read cookie manually because server components cannot access localStorage

  let contracts: ConsumerContractItem[] = [];
  try {
    contracts = await getContracts();
  } catch (err) {
    console.error(`Failed to fetch contracts:`, err);
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold">Contracts</h1>
        <p className="text-sm text-gray-500">All your contractors and their latest payment activity.</p>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <ContractsTable items={contracts} />
      </div>
    </div>
  );
}
