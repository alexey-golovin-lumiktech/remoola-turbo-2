'use client';

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

export function DocumentsFilterBar({
  filterKind,
  filterOptions,
  onFilterChange,
}: {
  filterKind: string;
  filterOptions: ReadonlyArray<FilterOption>;
  onFilterChange: (next: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {filterOptions.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onFilterChange(filter.value)}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
            filterKind === filter.value
              ? `bg-indigo-600 text-(--app-text)`
              : `bg-(--app-surface-muted) text-(--app-text-soft) hover:bg-white/10 hover:text-(--app-text-soft)`
          }`}
        >
          {filter.label} ({filter.count})
        </button>
      ))}
    </div>
  );
}
