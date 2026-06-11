'use client';

export function ContactsSearchForm({
  isSearchPending,
  onApply,
  onClear,
  onQueryChange,
  query,
}: {
  isSearchPending: boolean;
  onApply: () => void;
  onClear: () => void;
  onQueryChange: (value: string) => void;
  query: string;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_auto_auto]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or email"
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
        />
        <button
          type="button"
          disabled={isSearchPending}
          onClick={onApply}
          className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearchPending ? `Applying...` : `Search`}
        </button>
        <button
          type="button"
          disabled={isSearchPending}
          onClick={onClear}
          className="rounded-2xl border border-(--app-border) px-4 py-3 font-medium text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      <div className="mt-3 text-sm text-(--app-text-muted)">
        Search uses the backend contacts query contract and matches saved contact name or email only.
      </div>
    </div>
  );
}
