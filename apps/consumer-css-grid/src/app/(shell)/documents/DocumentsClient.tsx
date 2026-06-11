'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { AttachToPaymentModal } from './AttachToPaymentModal';
import { getDeleteBlockedMessage, isDeleteBlocked, type DocumentItem } from './document-helpers';
import { buildDocumentUploadFormData, uploadDocuments } from './document-upload-helpers';
import { DocumentList } from './DocumentList';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import { buildDocumentsViewModel } from './documents-view-model';
import { DocumentSelectionToolbar } from './DocumentSelectionToolbar';
import { DocumentsEmptyState } from './DocumentsEmptyState';
import { DocumentsFilterBar } from './DocumentsFilterBar';
import { DocumentsHeaderSection } from './DocumentsHeaderSection';
import { DocumentsMetricsSection } from './DocumentsMetricsSection';
import { DocumentUploadControl } from './DocumentUploadControl';
import {
  bulkDeleteDocumentsMutation,
  deleteDocumentMutation,
  updateDocumentTagsMutation,
} from '../../../lib/mutations/documents.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { shellMainAsidePrimary } from '../../../shared/ui/shell-layout-tokens';
import { ShellPagination } from '../../../shared/ui/ShellPagination';

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
        <DocumentsHeaderSection
          contractContext={contractContext}
          documentsHelpGuides={viewModel.documentsHelpGuides}
          documentsLength={documents.length}
          page={page}
          total={total}
          totalPages={viewModel.totalPages}
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
          <DocumentsEmptyState
            contractContext={contractContext}
            emptyStateHelpGuides={viewModel.emptyStateHelpGuides}
            hasDocumentsOnAnotherPage={viewModel.hasDocumentsOnAnotherPage}
            onReturnToFirstPage={returnToFirstPage}
          />
        ) : (
          <div>
            <DocumentsFilterBar
              filterKind={filterKind}
              filterOptions={viewModel.filterOptions}
              onFilterChange={(next) => {
                setFilterKind(next);
                setSelectedDocumentIds([]);
              }}
            />
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
        <ShellPagination
          disabled={isPending}
          onNext={() => applyPage(page + 1)}
          onPrev={() => applyPage(page - 1)}
          page={page}
          totalPages={viewModel.totalPages}
        />
      </div>

      <DocumentsMetricsSection
        complianceCount={viewModel.complianceCount}
        contractContext={contractContext}
        contractsCount={viewModel.contractsCount}
        documentsLength={documents.length}
        paymentCount={viewModel.paymentCount}
        total={total}
      />
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
