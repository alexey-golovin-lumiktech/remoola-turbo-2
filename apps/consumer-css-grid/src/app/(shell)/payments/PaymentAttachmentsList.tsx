'use client';

import { formatDateTime, formatFileSize } from './payment-attachments-formatters';
import { shellEmptyState } from '../../../shared/ui/shell-card-tokens';

type Attachment = {
  id: string;
  name: string;
  downloadUrl: string;
  size: number;
  createdAt: string;
};

export function PaymentAttachmentsList({
  attachments,
  canAttach,
  isPending,
  onRemove,
  removingAttachmentId,
}: {
  attachments: Attachment[];
  canAttach: boolean;
  isPending: boolean;
  onRemove: (attachment: Attachment) => void;
  removingAttachmentId: string | null;
}) {
  if (attachments.length === 0) {
    return <div className={shellEmptyState}>No attachments for this payment.</div>;
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <a href={attachment.downloadUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
              <div className="font-medium text-(--app-text)">{attachment.name}</div>
              <div className="mt-1 text-sm text-(--app-text-muted)">
                {formatFileSize(attachment.size)} · {formatDateTime(attachment.createdAt)}
              </div>
            </a>
            {canAttach ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onRemove(attachment)}
                className="rounded-2xl border border-(--app-border) px-4 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && removingAttachmentId === attachment.id ? `Removing...` : `Remove`}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
