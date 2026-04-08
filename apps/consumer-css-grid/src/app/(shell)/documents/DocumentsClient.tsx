'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { AttachToPaymentModal } from './AttachToPaymentModal';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import { SESSION_EXPIRED_ERROR_CODE } from '../../../lib/auth-failure';
import {
  bulkDeleteDocumentsMutation,
  deleteDocumentMutation,
  updateDocumentTagsMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { MetricLine } from '../../../shared/ui/shell-primitives';

type DocumentItem = {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  size: number;
  downloadUrl: string;
  tags: string[];
  isAttachedToDraftPaymentRequest: boolean;
  attachedDraftPaymentRequestIds: string[];
  isAttachedToNonDraftPaymentRequest: boolean;
  attachedNonDraftPaymentRequestIds: string[];
};

type Props = {
  documents: DocumentItem[];
  total: number;
  page: number;
  pageSize: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isDeleteBlocked(document: DocumentItem) {
  return document.isAttachedToDraftPaymentRequest || document.isAttachedToNonDraftPaymentRequest;
}

function getHistoricalRecordLabel(count: number) {
  return count === 1 ? `Attached to payment record` : `Attached to payment records`;
}

function getDeleteBlockedMessage(documentIds: string[], documents: DocumentItem[]) {
  const selectedDocuments = documents.filter((document) => documentIds.includes(document.id));
  const hasNonDraftAttachment = selectedDocuments.some((document) => document.isAttachedToNonDraftPaymentRequest);
  if (hasNonDraftAttachment) {
    return selectedDocuments.length === 1
      ? `This document is attached to a payment that is no longer a draft. It now remains part of that payment record, so it cannot be deleted from Documents.`
      : `Some selected documents are attached to payments that are no longer drafts. They now remain part of those payment records, so they cannot be deleted from Documents.`;
  }

  return selectedDocuments.length === 1
    ? `This document is still attached to a draft payment request. Open the draft and remove it there before deleting it from Documents.`
    : `Some selected documents are still attached to draft payment requests. Open each draft and remove them there before deleting them from Documents.`;
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
        message: `Document upload could not be completed because the network request failed. Please try again.`,
      },
    };
  }
}

export function DocumentsClient({ documents, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);
  const [filterKind, setFilterKind] = useState<string>(`all`);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [attachDocument, setAttachDocument] = useState<{
    id: string;
    name: string;
    attachedDraftPaymentRequestIds: string[];
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);

  const contractsCount = documents.filter((doc) => doc.kind === `CONTRACT`).length;
  const complianceCount = documents.filter((doc) => doc.kind === `COMPLIANCE`).length;
  const paymentCount = documents.filter((doc) => doc.kind === `PAYMENT`).length;
  const generalCount = documents.filter((doc) => doc.kind === `GENERAL`).length;
  const deletableDocumentIds = useMemo(
    () => documents.filter((doc) => !isDeleteBlocked(doc)).map((doc) => doc.id),
    [documents],
  );
  const deletableDocumentIdSet = useMemo(() => new Set(deletableDocumentIds), [deletableDocumentIds]);
  const blockedDraftDeleteCount = documents.filter(
    (doc) => doc.isAttachedToDraftPaymentRequest && !doc.isAttachedToNonDraftPaymentRequest,
  ).length;
  const blockedNonDraftDeleteCount = documents.filter((doc) => doc.isAttachedToNonDraftPaymentRequest).length;
  const allDeletableSelected =
    deletableDocumentIds.length > 0 &&
    deletableDocumentIds.every((documentId) => selectedDocumentIds.includes(documentId));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filteredDocuments = useMemo(() => {
    if (filterKind === `all`) return documents;
    return documents.filter((document) => document.kind === filterKind);
  }, [documents, filterKind]);

  const applyPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`page`, String(nextPage));
    params.set(`pageSize`, String(pageSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white/90">Document library</div>
            <div className="mt-1 text-sm text-white/45">
              Upload new files or remove outdated ones. Page {page} of {totalPages} shows {documents.length} of {total}
              documents.
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            name="files"
            multiple
            className="max-w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            onChange={(event) => {
              setSelectedFiles(Array.from(event.target.files ?? []).map((file) => file.name));
              setMessage(null);
            }}
          />
        </div>
        <div className="mb-4 text-sm text-white/45">
          {selectedFiles.length === 0
            ? `Choose one or more files before uploading.`
            : `${selectedFiles.length} file${selectedFiles.length === 1 ? `` : `s`} selected: ${selectedFiles.join(`, `)}`}
        </div>
        {message ? (
          <div
            className={
              message.type === `error`
                ? `mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200`
                : `mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200`
            }
          >
            {message.text}
          </div>
        ) : null}
        <button
          type="button"
          disabled={isPending || selectedFiles.length === 0}
          onClick={() => {
            const files = inputRef.current?.files;
            const formData = new FormData();
            if (files) {
              for (const file of Array.from(files)) {
                formData.append(`files`, file);
              }
            }
            setMessage(null);
            startTransition(async () => {
              const result = await uploadDocuments(formData);
              if (!result.ok) {
                if (handleSessionExpiredError(result.error)) return;
                setMessage({ type: `error`, text: result.error.message });
                return;
              }
              if (inputRef.current) {
                inputRef.current.value = ``;
              }
              setSelectedFiles([]);
              setMessage({ type: `success`, text: `Documents uploaded` });
              router.refresh();
            });
          }}
          className="mb-5 rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Uploading...` : selectedFiles.length === 0 ? `Select files to upload` : `Upload documents`}
        </button>
        {documents.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
            No documents uploaded yet.
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { value: `all`, label: `All`, count: documents.length },
                { value: `PAYMENT`, label: `Payment`, count: paymentCount },
                { value: `COMPLIANCE`, label: `Compliance`, count: complianceCount },
                { value: `CONTRACT`, label: `Contract`, count: contractsCount },
                { value: `GENERAL`, label: `General`, count: generalCount },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setFilterKind(filter.value);
                    setSelectedDocumentIds([]);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    filterKind === filter.value
                      ? `bg-indigo-600 text-white`
                      : `bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80`
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {documents.length > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="space-y-1 text-sm text-white/55">
                    {selectedDocumentIds.length === 0
                      ? `Select documents to delete multiple items at once.`
                      : `${selectedDocumentIds.length} document${selectedDocumentIds.length === 1 ? `` : `s`} selected`}
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedDocumentIds(allDeletableSelected ? [] : deletableDocumentIds);
                      }}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {allDeletableSelected ? `Clear selection` : `Select all deletable`}
                    </button>
                    <button
                      type="button"
                      disabled={isPending || selectedDocumentIds.length === 0}
                      onClick={() => {
                        const blockedSelected = selectedDocumentIds.filter((id) => !deletableDocumentIdSet.has(id));
                        if (blockedSelected.length > 0) {
                          setMessage({
                            type: `error`,
                            text: getDeleteBlockedMessage(blockedSelected, documents),
                          });
                          return;
                        }
                        setMessage(null);
                        startTransition(async () => {
                          const result = await bulkDeleteDocumentsMutation(selectedDocumentIds);
                          if (!result.ok) {
                            if (handleSessionExpiredError(result.error)) return;
                            setMessage({ type: `error`, text: result.error.message });
                            return;
                          }
                          setSelectedDocumentIds([]);
                          setMessage({ type: `success`, text: result.message ?? `Documents deleted` });
                          router.refresh();
                        });
                      }}
                      className="rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? `Deleting...` : `Delete selected`}
                    </button>
                  </div>
                </div>
              ) : null}
              {filteredDocuments.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
                  No documents match the selected filter.
                </div>
              ) : (
                filteredDocuments.map((document) => (
                  <div key={document.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.includes(document.id)}
                          onChange={(event) => {
                            setSelectedDocumentIds((current) =>
                              event.target.checked
                                ? [...current, document.id]
                                : current.filter((id) => id !== document.id),
                            );
                          }}
                          disabled={isDeleteBlocked(document)}
                          className="mt-1"
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(document)}
                            className="text-left font-medium text-white/90 transition hover:text-white"
                          >
                            {document.name}
                          </button>
                          <div className="mt-1 text-sm text-white/45">
                            {document.kind} · {formatFileSize(document.size)}
                          </div>
                          {document.isAttachedToDraftPaymentRequest ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                                Attached to draft payment request
                                {document.attachedDraftPaymentRequestIds.length > 1 ? `s` : ``}
                              </span>
                              {document.attachedDraftPaymentRequestIds.map((paymentRequestId, index) => (
                                <Link
                                  key={`${document.id}-${paymentRequestId}`}
                                  href={`/payments/${paymentRequestId}`}
                                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 transition hover:border-white/20 hover:text-white"
                                >
                                  {document.attachedDraftPaymentRequestIds.length === 1
                                    ? `Open draft`
                                    : `Open draft ${index + 1}`}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                          {document.isAttachedToNonDraftPaymentRequest ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
                                {getHistoricalRecordLabel(document.attachedNonDraftPaymentRequestIds.length)}
                              </span>
                              {document.attachedNonDraftPaymentRequestIds.map((paymentRequestId, index) => (
                                <Link
                                  key={`${document.id}-historical-${paymentRequestId}`}
                                  href={`/payments/${paymentRequestId}`}
                                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 transition hover:border-white/20 hover:text-white"
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
                              <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/35">
                                No tags
                              </span>
                            ) : (
                              document.tags.map((tag) => (
                                <span
                                  key={`${document.id}-${tag}`}
                                  className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-100"
                                >
                                  {tag}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-white/45">{formatDate(document.createdAt)}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={document.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75"
                      >
                        Open file
                      </a>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setAttachDocument({
                            id: document.id,
                            name: document.name,
                            attachedDraftPaymentRequestIds: document.attachedDraftPaymentRequestIds,
                          });
                        }}
                        className="rounded-xl border border-indigo-400/20 px-3 py-2 text-sm text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Attach to payment
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setEditingTagsId((current) => (current === document.id ? null : document.id));
                          setTagsDraft((current) => ({
                            ...current,
                            [document.id]: current[document.id] ?? document.tags.join(`, `),
                          }));
                        }}
                        className="rounded-xl border border-blue-400/20 px-3 py-2 text-sm text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editingTagsId === document.id ? `Close tags` : `Edit tags`}
                      </button>
                      <button
                        type="button"
                        disabled={isPending || isDeleteBlocked(document)}
                        onClick={() => {
                          if (isDeleteBlocked(document)) {
                            setMessage({
                              type: `error`,
                              text: getDeleteBlockedMessage([document.id], documents),
                            });
                            return;
                          }
                          setMessage(null);
                          setPendingDeleteId(document.id);
                          startTransition(async () => {
                            const result = await deleteDocumentMutation(document.id);
                            setPendingDeleteId(null);
                            if (!result.ok) {
                              if (handleSessionExpiredError(result.error)) return;
                              setMessage({ type: `error`, text: result.error.message });
                              return;
                            }
                            setSelectedDocumentIds((current) => current.filter((id) => id !== document.id));
                            setMessage({ type: `success`, text: result.message ?? `Document deleted` });
                            router.refresh();
                          });
                        }}
                        className="rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleteBlocked(document)
                          ? `Delete blocked`
                          : pendingDeleteId === document.id
                            ? `Deleting...`
                            : `Delete`}
                      </button>
                    </div>
                    {document.isAttachedToNonDraftPaymentRequest ? (
                      <div className="mt-3 text-xs text-rose-200/80">
                        Delete is disabled here because this file is already part of a sent or in-progress payment
                        record.
                      </div>
                    ) : document.isAttachedToDraftPaymentRequest ? (
                      <div className="mt-3 text-xs text-amber-200/80">
                        Delete is disabled here while this file is still attached to a draft payment request.
                      </div>
                    ) : null}

                    {editingTagsId === document.id ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-[#071225] p-4">
                        <label className="mb-2 block text-sm text-white/55" htmlFor={`document-tags-${document.id}`}>
                          Tags
                        </label>
                        <input
                          id={`document-tags-${document.id}`}
                          value={tagsDraft[document.id] ?? document.tags.join(`, `)}
                          onChange={(event) =>
                            setTagsDraft((current) => ({
                              ...current,
                              [document.id]: event.target.value,
                            }))
                          }
                          placeholder="invoice, compliance, urgent"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
                        />
                        <div className="mt-2 text-xs text-white/35">
                          Separate tags with commas. They are normalized to lowercase.
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setMessage(null);
                              startTransition(async () => {
                                const result = await updateDocumentTagsMutation(
                                  document.id,
                                  tagsDraft[document.id] ?? document.tags.join(`, `),
                                );
                                if (!result.ok) {
                                  if (handleSessionExpiredError(result.error)) return;
                                  setMessage({ type: `error`, text: result.error.message });
                                  return;
                                }
                                setEditingTagsId(null);
                                setMessage({ type: `success`, text: result.message ?? `Document tags updated` });
                                router.refresh();
                              });
                            }}
                            className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isPending ? `Saving...` : `Save tags`}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setTagsDraft((current) => ({ ...current, [document.id]: document.tags.join(`, `) }));
                              setEditingTagsId(null);
                            }}
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || page <= 1}
            onClick={() => applyPage(page - 1)}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={isPending || page >= totalPages}
            onClick={() => applyPage(page + 1)}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
        <div className="mb-4 text-lg font-semibold text-white/90">Storage summary</div>
        <div className="space-y-4">
          <MetricLine label="Visible on page" value={String(documents.length)} />
          <MetricLine label="Total files" value={String(total)} />
          <MetricLine label="Compliance docs" value={String(complianceCount)} />
          <MetricLine label="Payment docs" value={String(paymentCount)} />
          <MetricLine label="Contracts" value={String(contractsCount)} />
        </div>
      </div>
      {previewDoc ? <DocumentPreviewPanel document={previewDoc} onClose={() => setPreviewDoc(null)} /> : null}
      {attachDocument ? (
        <AttachToPaymentModal
          documentId={attachDocument.id}
          documentName={attachDocument.name}
          attachedDraftPaymentRequestIds={attachDocument.attachedDraftPaymentRequestIds}
          onClose={() => setAttachDocument(null)}
        />
      ) : null}
    </section>
  );
}
