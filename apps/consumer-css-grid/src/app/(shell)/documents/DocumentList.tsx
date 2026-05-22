import Link from 'next/link';

import {
  buildDocumentPaymentHref,
  formatDate,
  formatFileSize,
  getHistoricalRecordLabel,
  isDeleteBlocked,
  type DocumentContractContext,
  type DocumentItem,
} from './document-helpers';
import { DocumentTagEditor } from './DocumentTagEditor';
import { type PublicHelpGuideRegistryEntry } from '../../../features/help/guide-registry';
import { HelpInlineGuides } from '../../../features/help/ui';

type Props = {
  contractContext?: DocumentContractContext;
  deleteBlockedHelpGuides: PublicHelpGuideRegistryEntry[];
  documents: DocumentItem[];
  editingTagsId: string | null;
  isPending: boolean;
  pendingDeleteId: string | null;
  selectedDocumentIds: string[];
  tagsDraft: Record<string, string>;
  onAttach: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
  onPreview: (document: DocumentItem) => void;
  onTagsCancel: (document: DocumentItem) => void;
  onTagsChange: (document: DocumentItem, value: string) => void;
  onTagsSave: (document: DocumentItem) => void;
  onToggleSelected: (document: DocumentItem, selected: boolean) => void;
  onToggleTags: (document: DocumentItem) => void;
};

export function DocumentList({
  contractContext,
  deleteBlockedHelpGuides,
  documents,
  editingTagsId,
  isPending,
  pendingDeleteId,
  selectedDocumentIds,
  tagsDraft,
  onAttach,
  onDelete,
  onPreview,
  onTagsCancel,
  onTagsChange,
  onTagsSave,
  onToggleSelected,
  onToggleTags,
}: Props) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
        No documents match the selected filter.
      </div>
    );
  }

  return documents.map((document) => (
    <div key={document.id} className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selectedDocumentIds.includes(document.id)}
            onChange={(event) => onToggleSelected(document, event.target.checked)}
            disabled={isDeleteBlocked(document)}
            className="mt-1"
          />
          <div>
            <button
              type="button"
              onClick={() => onPreview(document)}
              className="text-left font-medium text-(--app-text) transition hover:text-(--app-text)"
            >
              {document.name}
            </button>
            <div className="mt-1 text-sm text-(--app-text-muted)">
              {document.kind} · {formatFileSize(document.size)}
            </div>
            {document.isAttachedToDraftPaymentRequest ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-(--app-warning-soft) bg-(--app-warning-soft) px-2 py-1 text-xs text-(--app-warning-text)">
                  Attached to draft payment request{document.attachedDraftPaymentRequestIds.length > 1 ? `s` : ``}
                </span>
                {document.attachedDraftPaymentRequestIds.map((paymentRequestId, index) => (
                  <Link
                    key={`${document.id}-${paymentRequestId}`}
                    href={buildDocumentPaymentHref(paymentRequestId, contractContext)}
                    className="rounded-full border border-(--app-border) px-2 py-1 text-xs text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
                  >
                    {document.attachedDraftPaymentRequestIds.length === 1 ? `Open draft` : `Open draft ${index + 1}`}
                  </Link>
                ))}
              </div>
            ) : null}
            {document.isAttachedToNonDraftPaymentRequest ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-(--app-danger-soft) bg-(--app-danger-soft) px-2 py-1 text-xs text-(--app-danger-text)">
                  {getHistoricalRecordLabel(document.attachedNonDraftPaymentRequestIds.length)}
                </span>
                {document.attachedNonDraftPaymentRequestIds.map((paymentRequestId, index) => (
                  <Link
                    key={`${document.id}-historical-${paymentRequestId}`}
                    href={buildDocumentPaymentHref(paymentRequestId, contractContext)}
                    className="rounded-full border border-(--app-border) px-2 py-1 text-xs text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
                  >
                    {document.attachedNonDraftPaymentRequestIds.length === 1
                      ? `Open payment`
                      : `Open payment ${index + 1}`}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {document.tags.length === 0 ? (
                <span className="rounded-full border border-(--app-border) px-2 py-1 text-xs text-(--app-text-faint)">
                  No tags
                </span>
              ) : (
                document.tags.map((tag) => (
                  <span
                    key={`${document.id}-${tag}`}
                    className="rounded-full border border-(--app-primary-soft) bg-(--app-primary-soft) px-2 py-1 text-xs text-(--app-primary)"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-(--app-text-muted)">{formatDate(document.createdAt)}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={document.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft)"
        >
          Open file
        </a>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAttach(document)}
          className="rounded-xl border border-indigo-400/20 px-3 py-2 text-sm text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Attach to payment
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onToggleTags(document)}
          className="rounded-xl border border-(--app-primary-soft) px-3 py-2 text-sm text-(--app-primary) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editingTagsId === document.id ? `Close tags` : `Edit tags`}
        </button>
        <button
          type="button"
          disabled={isPending || isDeleteBlocked(document)}
          onClick={() => onDelete(document)}
          className="rounded-xl border border-(--app-danger-soft) px-3 py-2 text-sm text-(--app-danger-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleteBlocked(document) ? `Delete blocked` : pendingDeleteId === document.id ? `Deleting...` : `Delete`}
        </button>
      </div>
      {document.isAttachedToNonDraftPaymentRequest ? (
        <div className="mt-3 text-xs text-rose-200/80">
          Delete is disabled here because this file is already part of a sent or in-progress payment record.
        </div>
      ) : document.isAttachedToDraftPaymentRequest ? (
        <div className="mt-3 text-xs text-(--app-warning-text)">
          Delete is disabled here while this file is still attached to a draft payment request.
        </div>
      ) : null}
      {isDeleteBlocked(document) ? (
        <HelpInlineGuides
          guides={deleteBlockedHelpGuides}
          title="Need help with this locked document?"
          className="mt-3"
        />
      ) : null}

      {editingTagsId === document.id ? (
        <DocumentTagEditor
          document={document}
          isPending={isPending}
          tagsDraft={tagsDraft[document.id] ?? document.tags.join(`, `)}
          onCancel={() => onTagsCancel(document)}
          onChange={(value) => onTagsChange(document, value)}
          onSave={() => onTagsSave(document)}
        />
      ) : null}
    </div>
  ));
}
