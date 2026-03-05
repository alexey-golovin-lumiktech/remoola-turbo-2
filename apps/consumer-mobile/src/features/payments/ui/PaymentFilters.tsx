'use client';

import { useState } from 'react';

import { Button } from '../../../shared/ui/Button';
import { DateInput } from '../../../shared/ui/DateInput';
import { FormField } from '../../../shared/ui/FormField';
import { FormSelect } from '../../../shared/ui/FormSelect';

interface PaymentFiltersProps {
  onFilterChange: (filters: PaymentFilterValues) => void;
  onReset: () => void;
}

export interface PaymentFilterValues {
  status?: string;
  currencyCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * PaymentFilters - Advanced filtering for payment history
 */
export function PaymentFilters({ onFilterChange, onReset }: PaymentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<PaymentFilterValues>({});

  const statusOptions = [
    { value: ``, label: `All statuses` },
    { value: `pending`, label: `Pending` },
    { value: `completed`, label: `Completed` },
    { value: `failed`, label: `Failed` },
    { value: `cancelled`, label: `Cancelled` },
  ];

  const currencyOptions = [
    { value: ``, label: `All currencies` },
    { value: `USD`, label: `USD` },
    { value: `EUR`, label: `EUR` },
    { value: `GBP`, label: `GBP` },
  ];

  const handleApply = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
    setIsOpen(false);
  };

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-white">Status</label>
              <FormSelect
                options={statusOptions}
                value={filters.status ?? ``}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-white">Currency</label>
              <FormSelect
                options={currencyOptions}
                value={filters.currencyCode ?? ``}
                onChange={(e) => setFilters({ ...filters, currencyCode: e.target.value || undefined })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="From" htmlFor="dateFrom">
                <DateInput
                  id="dateFrom"
                  value={filters.dateFrom ?? ``}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                />
              </FormField>
              <FormField label="To" htmlFor="dateTo">
                <DateInput
                  id="dateTo"
                  value={filters.dateTo ?? ``}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                />
              </FormField>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
                Reset
              </Button>
              <Button variant="primary" size="sm" onClick={handleApply} className="flex-1">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
