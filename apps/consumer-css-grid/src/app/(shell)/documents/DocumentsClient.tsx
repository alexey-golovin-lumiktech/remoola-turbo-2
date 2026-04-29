'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { AttachToPaymentModal } from './AttachToPaymentModal';
import { getDeleteBlockedMessage, isDeleteBlocked, type DocumentItem } from './document-helpers';
import { buildDocumentUploadFormData, uploadDocuments } from './document-upload-helpers';
import { DocumentList } from './DocumentList';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import { DocumentSelectionToolbar } from './DocumentSelectionToolbar';
import { DocumentUploadControl } from './DocumentUploadControl';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides, HelpInlineGuides } from '../../../features/help/ui';
import {
  bulkDeleteDocumentsMutation,
  deleteDocumentMutation,
  updateDocumentTagsMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
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

  const contractsCount = documents.filter((doc) => doc.kind === `CONTRACT`).length;
  const complianceCount = documents.filter((doc) => doc.kind === `COMPLIANCE`).length;
  const paymentCount = documents.filter((doc) => doc.kind === `PAYMENT`).length;
  const generalCount = documents.filter((doc) => doc.kind === `GENERAL`).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isContractMode = Boolean(contractContext);
  const filteredDocuments = useMemo(() => {
    if (filterKind === `all`) return documents;
    return documents.filter((document) => document.kind === filterKind);
  }, [documents, filterKind]);
  const deletableDocumentIds = useMemo(
    () => filteredDocuments.filter((doc) => !isDeleteBlocked(doc)).map((doc) => doc.id),
    [filteredDocuments],
  );
  const deletableDocumentIdSet = useMemo(() => new Set(deletableDocumentIds), [deletableDocumentIds]);
  const blockedDraftDeleteCount = filteredDocuments.filter(
    (doc) => doc.isAttachedToDraftPaymentRequest && !doc.isAttachedToNonDraftPaymentRequest,
  ).length;
  const blockedNonDraftDeleteCount = filteredDocuments.filter((doc) => doc.isAttachedToNonDraftPaymentRequest).length;
  const allDeletableSelected =
    deletableDocumentIds.length > 0 &&
    deletableDocumentIds.every((documentId) => selectedDocumentIds.includes(documentId));
  const documentsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DOCUMENTS,
    preferredSlugs: [
      HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
      HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES,
    ],
    limit: 3,
  });
  const emptyStateHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DOCUMENTS,
    preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH, HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW],
    limit: 2,
  });
  const blockedStateHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DOCUMENTS,
    preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES, HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH],
    limit: 2,
  });
  const deleteBlockedHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DOCUMENTS,
    preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES],
    limit: 1,
  });

  const applyPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`page`, String(nextPage));
    params.set(`pageSize`, String(pageSize));
    router.push(`${pathname}?${params.toString()}`);
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
      router.refresh();
    });
  };

  const handleDeleteSelected = () => {
    const blockedSelected = selectedDocumentIds.filter((id) => !deletableDocumentIdSet.has(id));
    if (blockedSelected.length > 0) {
      setMessage({
        type: `error`,
        text: getDeleteBlockedMessage(blockedSelected, filteredDocuments),
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
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
        {contractContext ? (
          <div className="mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-4 text-sm text-blue-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-blue-50">Contract files mode</div>
                <div className="mt-1 text-blue-100/80">
                  Showing relationship files for {contractContext.name} ({contractContext.email}).
                </div>
              </div>
              <Link
                href={contractContext.returnTo}
                className="rounded-xl border border-blue-300/20 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-500/10"
              >
                Back to contract
              </Link>
            </div>
          </div>
        ) : null}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white/90">
              {contractContext ? `Relationship files` : `Document library`}
            </div>
            <div className="mt-1 text-sm text-white/45">
              {contractContext
                ? `Preview, tag, and attach files already connected to this contract. Page ${page} of ${totalPages} shows ${documents.length} of ${total} files.`
                : `Upload new files or remove outdated ones. Page ${page} of ${totalPages} shows ${documents.length} of ${total} documents.`}
            </div>
          </div>
        </div>
        <HelpContextualGuides
          guides={documentsHelpGuides}
          compact
          className="mb-4"
          title={contractContext ? `Need help using contract-linked files?` : `Need help managing documents?`}
          description={
            contractContext
              ? `These guides explain how contract-linked files, document uploads, and payment attachments fit together without leaving this route family.`
              : `These guides explain uploads, attachments, and the delete restrictions that appear once a file becomes part of a payment flow.`
          }
        />
        {isContractMode ? (
          <div className="mb-4 text-sm text-white/45">
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
                ? `mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200`
                : `mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200`
            }
          >
            {message.text}
          </div>
        ) : null}
        {documents.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
            <div>{contractContext ? `No files are linked to this contract yet.` : `No documents uploaded yet.`}</div>
            <HelpInlineGuides
              guides={emptyStateHelpGuides}
              title={
                contractContext
                  ? `Need help understanding how files reach this contract view?`
                  : `Need help uploading the first document or attaching it later?`
              }
              className="mx-auto mt-4 max-w-3xl text-left"
            />
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
              {filteredDocuments.length > 1 ? (
                <DocumentSelectionToolbar
                  allDeletableSelected={allDeletableSelected}
                  blockedDraftDeleteCount={blockedDraftDeleteCount}
                  blockedNonDraftDeleteCount={blockedNonDraftDeleteCount}
                  blockedStateHelpGuides={blockedStateHelpGuides}
                  isPending={isPending}
                  selectedDocumentCount={selectedDocumentIds.length}
                  onDeleteSelected={handleDeleteSelected}
                  onToggleAllDeletable={() => setSelectedDocumentIds(allDeletableSelected ? [] : deletableDocumentIds)}
                />
              ) : null}
              <DocumentList
                contractContext={contractContext}
                deleteBlockedHelpGuides={deleteBlockedHelpGuides}
                documents={filteredDocuments}
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
        <div className="mb-4 text-lg font-semibold text-white/90">
          {contractContext ? `Contract files summary` : `Storage summary`}
        </div>
        <div className="space-y-4">
          <MetricLine label="Visible on page" value={String(documents.length)} />
          <MetricLine label={contractContext ? `Total contract files` : `Total files`} value={String(total)} />
          <MetricLine label="Compliance docs" value={String(complianceCount)} />
          <MetricLine label="Payment docs" value={String(paymentCount)} />
          <MetricLine label="Contracts" value={String(contractsCount)} />
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
