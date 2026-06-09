'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { AttachToPaymentModal } from './AttachToPaymentModal';
import { getDeleteBlockedMessage, isDeleteBlocked, type DocumentItem } from './document-helpers';
import { buildDocumentUploadFormData, uploadDocuments } from './document-upload-helpers';
import { DocumentList } from './DocumentList';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import { buildDocumentsViewModel } from './documents-view-model';
import { DocumentSelectionToolbar } from './DocumentSelectionToolbar';
import { DocumentUploadControl } from './DocumentUploadControl';
import { HelpContextualGuides, HelpInlineGuides } from '../../../features/help/ui';
import {
  bulkDeleteDocumentsMutation,
  deleteDocumentMutation,
  updateDocumentTagsMutation,
} from '../../../lib/mutations/documents.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { shellMainAsidePrimary } from '../../../shared/ui/shell-layout-tokens';
import { MetricLine } from '../../../shared/ui/shell-primitives';

type Props = {
  documents: DocumentItem[];
  total: number;
  page: number;
  pageSize: number;
  contractContext?: {
    id: string;
    name: string;
    email: string;
    returnTo: string;
    draftPaymentRequestIds: string[];
  } | null;
};

export function DocumentsClient({ documents, total, page, pageSize, contractContext = null }: Props) {
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
  const viewModel = useMemo(
    () =>
      buildDocumentsViewModel({
        documents,
        total,
        pageSize,
        contractContext,
        filterKind,
        selectedDocumentIds,
      }),
    [contractContext, documents, filterKind, pageSize, selectedDocumentIds, total],
  );

  const applyPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`page`, String(nextPage));
    params.set(`pageSize`, String(pageSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  const returnToFirstPage = () => {
    applyPage(1);
  };

  const handleUpload = () => {
    const formData = buildDocumentUploadFormData(inputRef.current?.files);
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
      if (page > 1) {
        returnToFirstPage();
        return;
      }
      router.refresh();
    });
  };

  const handleDeleteSelected = () => {
    const blockedSelected = selectedDocumentIds.filter((id) => !viewModel.deletableDocumentIdSet.has(id));
    if (blockedSelected.length > 0) {
      setMessage({
        type: `error`,
        text: viewModel.getDeleteBlockedMessageForSelection(blockedSelected),
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
  };

  const handleDeleteDocument = (document: DocumentItem) => {
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
  };

  const handleSaveTags = (document: DocumentItem) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateDocumentTagsMutation(document.id, tagsDraft[document.id] ?? document.tags.join(`, `));
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }
      setEditingTagsId(null);
      setMessage({ type: `success`, text: result.message ?? `Document tags updated` });
      router.refresh();
    });
  };

  return (
    <section className={shellMainAsidePrimary}>
      <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface-muted) p-5 backdrop-blur">
        {contractContext ? (
          <div className="mb-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-4 text-sm text-(--app-primary)">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-blue-50">Contract files mode</div>
                <div className="mt-1 text-blue-100/80">
                  Showing relationship files for {contractContext.name} ({contractContext.email}).
                </div>
              </div>
              <Link
                href={contractContext.returnTo}
                className="rounded-xl border border-blue-300/20 px-3 py-2 text-sm text-(--app-primary) transition hover:bg-(--app-primary-soft)"
              >
                Back to contract
              </Link>
            </div>
          </div>
        ) : null}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-(--app-text)">
              {contractContext ? `Relationship files` : `Document library`}
            </div>
            <div className="mt-1 text-sm text-(--app-text-muted)">
              {contractContext
                ? `Preview, tag, and attach files already connected to this contract. Page ${page} of ${viewModel.totalPages} shows ${documents.length} of ${total} files.`
                : `Upload new files or remove outdated ones. Page ${page} of ${viewModel.totalPages} shows ${documents.length} of ${total} documents.`}
            </div>
          </div>
        </div>
        <HelpContextualGuides
          guides={viewModel.documentsHelpGuides}
          compact
          className="mb-4"
          title={contractContext ? `Need help using contract-linked files?` : `Need help managing documents?`}
          description={
            contractContext
              ? `These guides explain how contract-linked files, document uploads, and payment attachments fit together without leaving this route family.`
              : `These guides explain uploads, attachments, and the delete restrictions that appear once a file becomes part of a payment flow.`
          }
        />
        {viewModel.isContractMode ? (
          <div className="mb-4 text-sm text-(--app-text-muted)">
            Upload remains in the full document library. This mode stays focused on files already tied to the current
            contractor relationship.
          </div>
        ) : (
          <DocumentUploadControl
            inputRef={inputRef}
            isPending={isPending}
            selectedFiles={selectedFiles}
            onFilesSelected={(files) => {
              setSelectedFiles(files);
              setMessage(null);
            }}
            onUpload={handleUpload}
          />
        )}
        {message ? (
          <div
            className={
              message.type === `error`
                ? `mb-4 rounded-2xl border border-(--app-danger-soft) bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)`
                : `mb-4 rounded-2xl border border-(--app-success-soft) bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)`
            }
          >
            {message.text}
          </div>
        ) : null}
        {documents.length === 0 ? (
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
            <div>
              {viewModel.hasDocumentsOnAnotherPage
                ? contractContext
                  ? `No files are visible on this page right now.`
                  : `No documents are visible on this page right now.`
                : contractContext
                  ? `No files are linked to this contract yet.`
                  : `No documents uploaded yet.`}
            </div>
            {viewModel.hasDocumentsOnAnotherPage ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={returnToFirstPage}
                  className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
                >
                  Go to page 1
                </button>
              </div>
            ) : null}
            <HelpInlineGuides
              guides={viewModel.emptyStateHelpGuides}
              title={
                viewModel.hasDocumentsOnAnotherPage
                  ? contractContext
                    ? `Need help getting back to the first contract files page?`
                    : `Need help getting back to the first documents page?`
                  : contractContext
                    ? `Need help understanding how files reach this contract view?`
                    : `Need help uploading the first document or attaching it later?`
              }
              className="mx-auto mt-4 max-w-3xl text-left"
            />
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {[...viewModel.filterOptions].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setFilterKind(filter.value);
                    setSelectedDocumentIds([]);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    filterKind === filter.value
                      ? `bg-indigo-600 text-(--app-text)`
                      : `bg-(--app-surface-muted) text-(--app-text-soft) hover:bg-white/10 hover:text-(--app-text-soft)`
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {viewModel.filteredDocuments.length > 1 ? (
                <DocumentSelectionToolbar
                  allDeletableSelected={viewModel.allDeletableSelected}
                  blockedDraftDeleteCount={viewModel.blockedDraftDeleteCount}
                  blockedNonDraftDeleteCount={viewModel.blockedNonDraftDeleteCount}
                  blockedStateHelpGuides={viewModel.blockedStateHelpGuides}
                  isPending={isPending}
                  selectedDocumentCount={selectedDocumentIds.length}
                  onDeleteSelected={handleDeleteSelected}
                  onToggleAllDeletable={() =>
                    setSelectedDocumentIds(viewModel.allDeletableSelected ? [] : viewModel.deletableDocumentIds)
                  }
                />
              ) : null}
              <DocumentList
                contractContext={contractContext}
                deleteBlockedHelpGuides={viewModel.deleteBlockedHelpGuides}
                documents={viewModel.filteredDocuments}
                editingTagsId={editingTagsId}
                isPending={isPending}
                pendingDeleteId={pendingDeleteId}
                selectedDocumentIds={selectedDocumentIds}
                tagsDraft={tagsDraft}
                onAttach={(document) =>
                  setAttachDocument({
                    id: document.id,
                    name: document.name,
                    attachedDraftPaymentRequestIds: document.attachedDraftPaymentRequestIds,
                  })
                }
                onDelete={handleDeleteDocument}
                onPreview={setPreviewDoc}
                onTagsCancel={(document) => {
                  setTagsDraft((current) => ({ ...current, [document.id]: document.tags.join(`, `) }));
                  setEditingTagsId(null);
                }}
                onTagsChange={(document, value) =>
                  setTagsDraft((current) => ({
                    ...current,
                    [document.id]: value,
                  }))
                }
                onTagsSave={handleSaveTags}
                onToggleSelected={(document, selected) => {
                  setSelectedDocumentIds((current) =>
                    selected ? [...current, document.id] : current.filter((id) => id !== document.id),
                  );
                }}
                onToggleTags={(document) => {
                  setEditingTagsId((current) => (current === document.id ? null : document.id));
                  setTagsDraft((current) => ({
                    ...current,
                    [document.id]: current[document.id] ?? document.tags.join(`, `),
                  }));
                }}
              />
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || page <= 1}
            onClick={() => applyPage(page - 1)}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={isPending || page >= viewModel.totalPages}
            onClick={() => applyPage(page + 1)}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface-muted) p-5 backdrop-blur">
        <div className="mb-4 text-lg font-semibold text-(--app-text)">
          {contractContext ? `Contract files summary` : `Storage summary`}
        </div>
        <div className="space-y-4">
          <MetricLine label="Visible on page" value={String(documents.length)} />
          <MetricLine label={contractContext ? `Total contract files` : `Total files`} value={String(total)} />
          <MetricLine label="Compliance docs" value={String(viewModel.complianceCount)} />
          <MetricLine label="Payment docs" value={String(viewModel.paymentCount)} />
          <MetricLine label="Contracts" value={String(viewModel.contractsCount)} />
          {contractContext ? (
            <MetricLine label="Draft payments in scope" value={String(contractContext.draftPaymentRequestIds.length)} />
          ) : null}
        </div>
      </div>
      {previewDoc ? <DocumentPreviewPanel document={previewDoc} onClose={() => setPreviewDoc(null)} /> : null}
      {attachDocument ? (
        <AttachToPaymentModal
          documentId={attachDocument.id}
          documentName={attachDocument.name}
          attachedDraftPaymentRequestIds={attachDocument.attachedDraftPaymentRequestIds}
          allowedPaymentRequestIds={contractContext?.draftPaymentRequestIds}
          scopeLabel={contractContext ? `${contractContext.name} contract` : undefined}
          onClose={() => setAttachDocument(null)}
        />
      ) : null}
    </section>
  );
}
