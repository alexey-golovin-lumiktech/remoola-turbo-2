'use client';

import { flexRowGap3ItemsCenter, formInputBase, searchInputClass, width64 } from '../ui/classNames';

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
    <div className={flexRowGap3ItemsCenter}>
      {/* Search */}
      <input
        type="text"
        placeholder="Search…"
        className={`${width64} ${searchInputClass}`}
        value={search}
        onChange={(e) => onSearchChangeAction(e.target.value)}
      />

      {/* Status Filter */}
      <select className={formInputBase} value={status} onChange={(e) => onStatusChangeAction(e.target.value)}>
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="WAITING">Waiting</option>
        <option value="COMPLETED">Completed</option>
      </select>

      {/* Type Filter */}
      <select className={formInputBase} value={type} onChange={(e) => onTypeChangeAction(e.target.value)}>
        <option value="">All types</option>
        <option value="CREDIT_CARD">Credit Card</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
        <option value="CURRENCY_EXCHANGE">Currency Exchange</option>
      </select>
    </div>
  );
}
