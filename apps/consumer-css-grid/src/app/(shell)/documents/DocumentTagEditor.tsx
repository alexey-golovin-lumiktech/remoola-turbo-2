import { type DocumentItem } from './document-helpers';

type Props = {
  document: DocumentItem;
  isPending: boolean;
  tagsDraft: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function DocumentTagEditor({ document, isPending, tagsDraft, onCancel, onChange, onSave }: Props) {
  return (
    <div className="mt-4 rounded-2xl border border-(--app-border) bg-(--app-surface-strong) p-4">
      <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor={`document-tags-${document.id}`}>
        Tags
      </label>
      <input
        id={`document-tags-${document.id}`}
        value={tagsDraft}
        onChange={(event) => onChange(event.target.value)}
        placeholder="invoice, compliance, urgent"
        className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
      />
      <div className="mt-2 text-xs text-(--app-text-faint)">
        Separate tags with commas. They are normalized to lowercase.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="rounded-xl bg-(--app-primary) px-3 py-2 text-sm font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Saving...` : `Save tags`}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
