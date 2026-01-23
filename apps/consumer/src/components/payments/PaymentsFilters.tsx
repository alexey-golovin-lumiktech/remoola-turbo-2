'use client';

type PaymentsFiltersProps = {
  status: string;
  type: string;
  search: string;
  onStatusChangeAction: (v: string) => void;
  onTypeChangeAction: (v: string) => void;
  onSearchChangeAction: (v: string) => void;
};

export function PaymentsFilters({
  status,
  type,
  search,
  onStatusChangeAction,
  onTypeChangeAction,
  onSearchChangeAction,
}: PaymentsFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search…"
        className="w-64 px-3 py-2 rounded-md border text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        value={search}
        onChange={(e) => onSearchChangeAction(e.target.value)}
      />

      {/* Status Filter */}
      <select
        className="px-3 py-2 rounded-md border text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
        value={status}
        onChange={(e) => onStatusChangeAction(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="WAITING">Waiting</option>
        <option value="COMPLETED">Completed</option>
      </select>

      {/* Type Filter */}
      <select
        className="px-3 py-2 rounded-md border text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
        value={type}
        onChange={(e) => onTypeChangeAction(e.target.value)}
      >
        <option value="">All types</option>
        <option value="CREDIT_CARD">Credit Card</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
        <option value="CURRENCY_EXCHANGE">Currency Exchange</option>
      </select>
    </div>
  );
}
