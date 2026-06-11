'use client';

import { formatDateTime, formatFileSize } from './payment-attachments-formatters';
import { type getPaymentAttachmentsLibraryState } from './payment-attachments-library-state';
import { ShellPagination } from '../../../shared/ui/ShellPagination';

type LibraryState = ReturnType<typeof getPaymentAttachmentsLibraryState>;

type AvailableDocument = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  kind: string;
  tags: string[];
};

export function PaymentAttachmentsLibrarySection({
  attachableDocuments,
  attachmentLibraryState,
  availableDocumentPages,
  availableDocumentsPage,
  hasAnyAvailable,
  isPending,
  onAttachSelected,
  onNextPage,
  onPrevPage,
  onToggleDocument,
  selectedDocumentIds,
}: {
  attachableDocuments: AvailableDocument[];
  attachmentLibraryState: LibraryState;
  availableDocumentPages: number;
  availableDocumentsPage: number;
  hasAnyAvailable: boolean;
  isPending: boolean;
  onAttachSelected: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onToggleDocument: (documentId: string, checked: boolean) => void;
  selectedDocumentIds: string[];
}) {
  if (!hasAnyAvailable) {
    return (
      <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-4 text-sm text-(--app-text-soft)">
        {attachmentLibraryState.emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) p-4">
      <div className="text-sm text-(--app-primary)">
        Attach existing files from your document library. Page {availableDocumentsPage} of {availableDocumentPages}
        shows {attachableDocuments.length} attachable files.
      </div>
      {attachmentLibraryState.hasAttachableDocuments ? (
        <div className="mt-3 space-y-2">
          {attachableDocuments.map((document) => {
            const checked = selectedDocumentIds.includes(document.id);
            return (
              <label
                key={document.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                  checked
                    ? `border-blue-400/40 bg-(--app-primary-soft)`
                    : `border-(--app-border) bg-(--app-surface-muted) hover:border-(--app-border-strong)`
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onToggleDocument(document.id, event.target.checked)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-(--app-text)">{document.name}</div>
                  <div className="mt-1 text-sm text-(--app-text-muted)">
                    {document.kind} · {formatFileSize(document.size)} · {formatDateTime(document.createdAt)}
                  </div>
                  {document.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {document.tags.slice(0, 4).map((tag) => (
                        <span
                          key={`${document.id}-${tag}`}
                          className="rounded-full border border-(--app-border) px-2 py-1 text-xs text-(--app-text-muted)"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-4 text-sm text-(--app-text-soft)">
          {attachmentLibraryState.emptyMessage}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {attachmentLibraryState.hasAttachableDocuments ? (
          <button
            type="button"
            disabled={isPending || selectedDocumentIds.length === 0}
            onClick={onAttachSelected}
            className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? `Attaching...` : selectedDocumentIds.length === 0 ? `Select documents` : `Attach selected`}
          </button>
        ) : null}
      </div>
      {attachmentLibraryState.showPagination ? (
        <ShellPagination
          disabled={isPending}
          onNext={onNextPage}
          onPrev={onPrevPage}
          page={availableDocumentsPage}
          totalPages={availableDocumentPages}
        />
      ) : null}
    </div>
  );
}
