export function ShellPagination({
  disabled,
  onNext,
  onPrev,
  page,
  totalPages,
}: {
  disabled?: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={onPrev}
        className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={onNext}
        className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
