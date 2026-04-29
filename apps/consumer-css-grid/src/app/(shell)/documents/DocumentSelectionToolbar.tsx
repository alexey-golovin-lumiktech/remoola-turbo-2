import { type PublicHelpGuideRegistryEntry } from '../../../features/help/guide-registry';
import { HelpInlineGuides } from '../../../features/help/ui';

type Props = {
  allDeletableSelected: boolean;
  blockedDraftDeleteCount: number;
  blockedNonDraftDeleteCount: number;
  blockedStateHelpGuides: PublicHelpGuideRegistryEntry[];
  isPending: boolean;
  selectedDocumentCount: number;
  onDeleteSelected: () => void;
  onToggleAllDeletable: () => void;
};

export function DocumentSelectionToolbar({
  allDeletableSelected,
  blockedDraftDeleteCount,
  blockedNonDraftDeleteCount,
  blockedStateHelpGuides,
  isPending,
  selectedDocumentCount,
  onDeleteSelected,
  onToggleAllDeletable,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-1 text-sm text-white/55">
        {selectedDocumentCount === 0
          ? `Select documents to delete multiple items at once.`
          : `${selectedDocumentCount} document${selectedDocumentCount === 1 ? `` : `s`} selected`}
        {blockedDraftDeleteCount > 0 ? (
          <div className="text-xs text-amber-200/80">
            {blockedDraftDeleteCount === 1
              ? `1 document is attached only to a draft payment request and must be detached there before deletion.`
              : `${blockedDraftDeleteCount} documents are attached only to draft payment requests and must be detached there before deletion.`}
          </div>
        ) : null}
        {blockedNonDraftDeleteCount > 0 ? (
          <div className="text-xs text-rose-200/80">
            {blockedNonDraftDeleteCount === 1
              ? `1 document is attached to a payment that is no longer a draft, so it stays locked here as part of that payment record.`
              : `${blockedNonDraftDeleteCount} documents are attached to payments that are no longer drafts, so they stay locked here as part of those payment records.`}
          </div>
        ) : null}
        {blockedDraftDeleteCount > 0 || blockedNonDraftDeleteCount > 0 ? (
          <HelpInlineGuides
            guides={blockedStateHelpGuides}
            title="Need help understanding why delete is blocked?"
            className="mt-3"
          />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onToggleAllDeletable}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allDeletableSelected ? `Clear selection` : `Select all deletable`}
        </button>
        <button
          type="button"
          disabled={isPending || selectedDocumentCount === 0}
          onClick={onDeleteSelected}
          className="rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Deleting...` : `Delete selected`}
        </button>
      </div>
    </div>
  );
}
