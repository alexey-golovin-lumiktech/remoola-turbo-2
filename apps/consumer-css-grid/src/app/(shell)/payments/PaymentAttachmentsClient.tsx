'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { getPaymentAttachmentsLibraryState } from './payment-attachments-library-state';
import { buildPaymentDocumentsHref } from './payment-flow-context';
import {
  attachDocumentsToPaymentRequestMutation,
  detachDocumentFromPaymentRequestMutation,
} from '../../../lib/actions/payments.server';
import { SESSION_EXPIRED_ERROR_CODE } from '../../../lib/auth-failure';
import { handleSessionExpiredError } from '../../../lib/session-expired';

type Attachment = {
  id: string;
  name: string;
  downloadUrl: string;
  size: number;
  createdAt: string;
};

type AvailableDocument = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  kind: string;
  tags: string[];
};

type Props = {
  paymentRequestId: string;
  role: string;
  status: string;
  attachments: Attachment[];
  availableDocuments: AvailableDocument[];
  availableDocumentsTotal: number;
  availableDocumentsPage: number;
  availableDocumentsPageSize: number;
  contractId?: string | null;
  returnTo?: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadDocuments(formData: FormData) {
  try {
    const response = await fetch(`/api/documents/upload`, {
      method: `POST`,
      body: formData,
      cache: `no-store`,
      credentials: `include`,
    });
    const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;

    if (!response.ok) {
      return {
        ok: false as const,
        error: {
          code: response.status === 401 ? SESSION_EXPIRED_ERROR_CODE : (payload?.code ?? `API_ERROR`),
          message:
            response.status === 401
              ? `Your session has expired. Please sign in again.`
              : (payload?.message ?? `Failed to upload document`),
        },
      };
    }

    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: {
        code: `NETWORK_ERROR`,
        message: `Attachment upload could not be completed because the network request failed. Please try again.`,
      },
    };
  }
}

export function PaymentAttachmentsClient({
  paymentRequestId,
  role,
  status,
  attachments,
  availableDocuments,
  availableDocumentsTotal,
  availableDocumentsPage,
  availableDocumentsPageSize,
  contractId,
  returnTo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: `success` | `error`; text: string } | null>(null);

  const canAttach = role.toUpperCase() === `REQUESTER` && status.toUpperCase() === `DRAFT`;
  const attachedIds = useMemo(() => new Set(attachments.map((attachment) => attachment.id)), [attachments]);
  const attachableDocuments = useMemo(
    () => availableDocuments.filter((document) => !attachedIds.has(document.id)),
    [attachedIds, availableDocuments],
  );
  const showHistoricalRecordNotice = !canAttach && attachments.length > 0;
  const attachmentLibraryState = getPaymentAttachmentsLibraryState({
    availableDocumentsCount: availableDocuments.length,
    attachableDocumentsCount: attachableDocuments.length,
    availableDocumentsTotal,
    availableDocumentsPage,
    availableDocumentsPageSize,
  });
  const availableDocumentPages = attachmentLibraryState.totalPages;
  const documentsHref = useMemo(
    () => buildPaymentDocumentsHref({ contractId: contractId ?? undefined, returnTo: returnTo ?? undefined }),
    [contractId, returnTo],
  );

  const applyDocumentPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`attachmentPage`, String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {canAttach ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) p-4">
            <div className="text-sm text-(--app-primary)">
              Upload a new file directly to this draft or attach an existing file from your document library.
            </div>
            <div className="mt-3 rounded-2xl border border-(--app-border) bg-(--app-surface-strong) p-4">
              <input
                ref={uploadInputRef}
                type="file"
                name="files"
                multiple
                className="max-w-full text-sm text-(--app-text-soft) file:mr-4 file:rounded-xl file:border-0 file:bg-(--app-primary) file:px-4 file:py-2 file:text-sm file:font-medium file:text-(--app-text)"
                onChange={(event) => {
                  setSelectedFiles(Array.from(event.target.files ?? []).map((file) => file.name));
                  setMessage(null);
                }}
              />
              <div className="mt-3 text-sm text-(--app-text-muted)">
                {selectedFiles.length === 0
                  ? `Choose one or more files to upload directly into this draft.`
                  : `${selectedFiles.length} file${selectedFiles.length === 1 ? `` : `s`} selected: ${selectedFiles.join(`, `)}`}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isPending || selectedFiles.length === 0}
                  onClick={() => {
                    const files = uploadInputRef.current?.files;
                    const formData = new FormData();
                    if (files) {
                      for (const file of Array.from(files)) {
                        formData.append(`files`, file);
                      }
                    }
                    formData.append(`paymentRequestId`, paymentRequestId);
                    setMessage(null);
                    startTransition(async () => {
                      const result = await uploadDocuments(formData);
                      if (!result.ok) {
                        if (handleSessionExpiredError(result.error)) return;
                        setMessage({ type: `error`, text: result.error.message });
                        return;
                      }
                      if (uploadInputRef.current) {
                        uploadInputRef.current.value = ``;
                      }
                      setSelectedFiles([]);
                      setMessage({ type: `success`, text: `Attachment uploaded` });
                      router.refresh();
                    });
                  }}
                  className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? `Uploading...` : selectedFiles.length === 0 ? `Select files` : `Upload to draft`}
                </button>
                <Link
                  href={documentsHref}
                  className="rounded-2xl border border-(--app-border) px-4 py-3 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
                >
                  {contractId ? `Open contract files` : `Open document library`}
                </Link>
              </div>
            </div>
          </div>

          {availableDocumentsTotal > 0 || availableDocuments.length > 0 ? (
            <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) p-4">
              <div className="text-sm text-(--app-primary)">
                Attach existing files from your document library. Page {availableDocumentsPage} of{` `}
                {availableDocumentPages}
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
                          onChange={(event) => {
                            setSelectedDocumentIds((current) =>
                              event.target.checked
                                ? [...current, document.id]
                                : current.filter((currentId) => currentId !== document.id),
                            );
                            setMessage(null);
                          }}
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
                    onClick={() => {
                      setMessage(null);
                      startTransition(async () => {
                        const result = await attachDocumentsToPaymentRequestMutation(
                          paymentRequestId,
                          selectedDocumentIds,
                        );
                        if (!result.ok) {
                          if (handleSessionExpiredError(result.error)) return;
                          setMessage({ type: `error`, text: result.error.message });
                          return;
                        }
                        setSelectedDocumentIds([]);
                        setMessage({ type: `success`, text: result.message ?? `Documents attached` });
                        router.refresh();
                      });
                    }}
                    className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending
                      ? `Attaching...`
                      : selectedDocumentIds.length === 0
                        ? `Select documents`
                        : `Attach selected`}
                  </button>
                ) : null}
                {attachmentLibraryState.showPagination ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending || availableDocumentsPage <= 1}
                      onClick={() => applyDocumentPage(availableDocumentsPage - 1)}
                      className="rounded-2xl border border-(--app-border) px-4 py-3 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous page
                    </button>
                    <button
                      type="button"
                      disabled={isPending || availableDocumentsPage >= availableDocumentPages}
                      onClick={() => applyDocumentPage(availableDocumentsPage + 1)}
                      className="rounded-2xl border border-(--app-border) px-4 py-3 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next page
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-4 text-sm text-(--app-text-soft)">
              {attachmentLibraryState.emptyMessage}
            </div>
          )}
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === `error`
              ? `border-(--app-danger-soft) bg-(--app-danger-soft) text-(--app-danger-text)`
              : `border-(--app-success-soft) bg-(--app-success-soft) text-(--app-success-text)`
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {showHistoricalRecordNotice ? (
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
          These files are part of this payment record now. You can review them here, but attachments can only be added
          or removed while the request is still a draft.
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
          No attachments for this payment.
        </div>
      ) : (
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
                    onClick={() => {
                      setMessage(null);
                      setRemovingAttachmentId(attachment.id);
                      startTransition(async () => {
                        const result = await detachDocumentFromPaymentRequestMutation(paymentRequestId, attachment.id);
                        setRemovingAttachmentId(null);
                        if (!result.ok) {
                          if (handleSessionExpiredError(result.error)) return;
                          setMessage({ type: `error`, text: result.error.message });
                          return;
                        }
                        setMessage({ type: `success`, text: result.message ?? `Attachment removed from draft` });
                        router.refresh();
                      });
                    }}
                    className="rounded-2xl border border-(--app-border) px-4 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending && removingAttachmentId === attachment.id ? `Removing...` : `Remove`}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
