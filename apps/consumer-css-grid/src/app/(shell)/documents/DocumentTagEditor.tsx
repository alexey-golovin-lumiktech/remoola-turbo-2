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
    <div className="mt-4 rounded-2xl border border-white/10 bg-[#071225] p-4">
      <label className="mb-2 block text-sm text-white/55" htmlFor={`document-tags-${document.id}`}>
        Tags
      </label>
      <input
        id={`document-tags-${document.id}`}
        value={tagsDraft}
        onChange={(event) => onChange(event.target.value)}
        placeholder="invoice, compliance, urgent"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
      />
      <div className="mt-2 text-xs text-white/35">Separate tags with commas. They are normalized to lowercase.</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Saving...` : `Save tags`}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
