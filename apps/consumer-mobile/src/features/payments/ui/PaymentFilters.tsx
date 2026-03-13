'use client';

import { useState } from 'react';

import styles from './PaymentFilters.module.css';
import { Button } from '../../../shared/ui/Button';
import { DateInput } from '../../../shared/ui/DateInput';
import { FormField } from '../../../shared/ui/FormField';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { FilterIcon } from '../../../shared/ui/icons/FilterIcon';

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
    <div className={styles.wrap}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.trigger}>
        <FilterIcon className={styles.triggerIcon} strokeWidth={2} />
        Filters
        {activeFilterCount > 0 ? <span className={styles.badge}>{activeFilterCount}</span> : null}
      </button>

      {isOpen ? (
        <div className={styles.dropdown}>
          <div className={styles.body}>
            <div>
              <label className={styles.label}>Status</label>
              <FormSelect
                options={statusOptions}
                value={filters.status ?? ``}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              />
            </div>

            <div>
              <label className={styles.label}>Currency</label>
              <FormSelect
                options={currencyOptions}
                value={filters.currencyCode ?? ``}
                onChange={(e) => setFilters({ ...filters, currencyCode: e.target.value || undefined })}
              />
            </div>

            <div className={styles.dateGrid}>
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

            <div className={styles.actions}>
              <Button variant="outline" size="sm" onClick={handleReset} className={styles.actionBtn}>
                Reset
              </Button>
              <Button variant="primary" size="sm" onClick={handleApply} className={styles.actionBtn}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
