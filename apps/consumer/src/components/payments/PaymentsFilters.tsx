'use client';

import { FormSelect, type FormSelectOption } from '../ui';
import styles from '../ui/classNames.module.css';

const { filterRowControlHeight, filterRowGap3AlignEnd, filterRowSearchInput, width64 } = styles;

const STATUS_OPTIONS: FormSelectOption[] = [
  { value: ``, label: `All statuses` },
  { value: `PENDING`, label: `Pending` },
  { value: `WAITING`, label: `Waiting` },
  { value: `COMPLETED`, label: `Completed` },
];

const TYPE_OPTIONS: FormSelectOption[] = [
  { value: ``, label: `All types` },
  { value: `CREDIT_CARD`, label: `Credit Card` },
  { value: `BANK_TRANSFER`, label: `Bank Transfer` },
  { value: `CURRENCY_EXCHANGE`, label: `Currency Exchange` },
];

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
    <div className={filterRowGap3AlignEnd}>
      {/* Search — fixed 42px height so it aligns with selects */}
      <div className={`${filterRowControlHeight} ${width64}`}>
        <input
          type="text"
          placeholder="Search…"
          className={`${filterRowSearchInput} h-full w-full`}
          value={search}
          onChange={(e) => onSearchChangeAction(e.target.value)}
        />
      </div>

      <FormSelect
        label=""
        value={status}
        onChange={onStatusChangeAction}
        options={STATUS_OPTIONS}
        placeholder="All statuses"
        isClearable={false}
      />
      <FormSelect
        label=""
        value={type}
        onChange={onTypeChangeAction}
        options={TYPE_OPTIONS}
        placeholder="All types"
        isClearable={false}
      />
    </div>
  );
}
