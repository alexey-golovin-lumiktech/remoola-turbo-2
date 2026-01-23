import { ContractsTable } from '../../../components';

export default async function ContractsPage() {
  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Contracts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">All your contractors and their latest payment activity.</p>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm">
        <ContractsTable />
      </div>
    </div>
  );
}
