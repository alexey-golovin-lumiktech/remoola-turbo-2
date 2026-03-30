'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { DocumentFilterBar } from './DocumentFilterBar';
import { DocumentUploadButton } from './DocumentUploadButton';
import { PaymentPickerModal } from './PaymentPickerModal';
import { TagEditor } from './TagEditor';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { EyeIcon } from '../../../shared/ui/icons/EyeIcon';
import { PaperclipIcon } from '../../../shared/ui/icons/PaperclipIcon';
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon';
import { TagIcon } from '../../../shared/ui/icons/TagIcon';
import { TrashIcon } from '../../../shared/ui/icons/TrashIcon';
import { SegmentedButton } from '../../../shared/ui/SegmentedButton';
import { bulkDeleteDocuments } from '../actions';
import { DocumentPreviewModal } from '../DocumentPreviewModal';
import { type DocumentItem } from '../queries';
import { type DocumentKind } from '../schemas';
import styles from './EnhancedDocumentsView.module.css';

interface EnhancedDocumentsViewProps {
  items: DocumentItem[];
}

/**
 * EnhancedDocumentsView - Full-featured document management view
 * Features: upload, bulk delete, filter, attach to payment, tags, preview
 * Mobile-first with 44px touch targets and improved UX
 */
export function EnhancedDocumentsView({ items }: EnhancedDocumentsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [filterKind, setFilterKind] = useState<DocumentKind>(`All`);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [attachingDocId, setAttachingDocId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    if (filterKind === `All`) return true;
    const kind = (item.kind as string) ?? `General`;
    return kind === filterKind;
  });

  const allSelected = filteredItems.length > 0 && selectedDocs.size === filteredItems.length;
  const someSelected = selectedDocs.size > 0 && !allSelected;

  const filterCounts = {
    All: items.length,
    Payment: items.filter((i) => (i.kind as string) === `Payment`).length,
    Compliance: items.filter((i) => (i.kind as string) === `Compliance`).length,
    Contract: items.filter((i) => (i.kind as string) === `Contract`).length,
    General: items.filter((i) => ((i.kind as string) ?? `General`) === `General`).length,
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedDocs(new Set());
    } else {
      const allIds = filteredItems.map((item) => item.id).filter((id): id is string => !!id);
      setSelectedDocs(new Set(allIds));
    }
  };

  const handleToggleDoc = (id: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocs(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;

    const docIds = Array.from(selectedDocs);
    const result = await bulkDeleteDocuments({ documentIds: docIds });

    if (result.ok) {
      showSuccessToast(`${docIds.length} document${docIds.length > 1 ? `s` : ``} deleted successfully`);
      setShowDeleteConfirm(false);
      setSelectedDocs(new Set());
      startTransition(() => {
        router.refresh();
      });
    } else {
      const msg = getErrorMessageForUser(
        result.error.code,
        getLocalToastMessage(localToastKeys.DOCUMENTS_DELETE_FAILED),
      );
      showErrorToast(msg, { code: result.error.code });
    }
  };

  const handleUploadComplete = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className={styles.main} data-testid="enhanced-documents-view">
      <div className={styles.topBar}>
        <DocumentFilterBar activeFilter={filterKind} onFilterChange={setFilterKind} filterCounts={filterCounts} />
        <div className={styles.uploadWrap}>
          <DocumentUploadButton onUploadComplete={handleUploadComplete} />
        </div>
      </div>

      {selectedDocs.size > 0 ? (
        <div className={styles.selectionBar}>
          <div className="flex items-center gap-3">
            <div className={styles.selectionBarIcon}>
              <CheckIcon className={styles.selectionBarIconSvg} strokeWidth={2.5} />
            </div>
            <span className={styles.selectionBarText}>
              {selectedDocs.size} document{selectedDocs.size === 1 ? `` : `s`} selected
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isPending}>
            <TrashIcon className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        filterKind === `All` ? (
          <div className={styles.emptyBlock}>
            <div className={styles.emptyIcon}>
              <DocumentIcon className={styles.emptyIconSvg} strokeWidth={1.5} />
            </div>
            <EmptyState
              icon={null}
              title="No documents yet"
              description="Upload documents to keep track of invoices, receipts, and contracts."
            />
          </div>
        ) : (
          <div className={styles.emptyBlockFiltered}>
            <div className={styles.emptyIconFiltered}>
              <SearchIcon className={styles.emptyIconSvg} strokeWidth={1.5} />
            </div>
            <h3 className={styles.emptyTitle}>No documents found</h3>
            <p className={styles.emptyMessage}>Try adjusting your filter or upload new documents to get started.</p>
          </div>
        )
      ) : (
        <>
          <div className={styles.toolbar}>
            <button
              onClick={handleToggleAll}
              className={styles.selectAllBtn}
              aria-label={allSelected ? `Deselect all` : `Select all`}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {}}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                className={styles.selectAllCheckbox}
              />
              <span>{allSelected ? `Deselect All` : `Select All`}</span>
            </button>
            <span className={styles.countBadge}>
              {filteredItems.length} document{filteredItems.length === 1 ? `` : `s`}
            </span>
          </div>

          <div className={styles.list}>
            {filteredItems.map((item) => {
              const id = item.id as string | undefined;
              const name = item.name as string | undefined;
              const createdAt = item.createdAt as string | undefined;
              const tags = (item.tags as string[]) ?? [];
              const kind = (item.kind as string) ?? `General`;
              const key = id ?? String(Math.random());
              const isSelected = id ? selectedDocs.has(id) : false;

              return (
                <div key={key} className={`${styles.card} ${isSelected ? styles.cardSelected : styles.cardUnselected}`}>
                  <div className={styles.cardOverlay} />
                  <div className={styles.cardBody}>
                    <div className={styles.cardRow}>
                      {id ? (
                        <button
                          onClick={() => handleToggleDoc(id)}
                          className={styles.cardCheckboxWrap}
                          aria-label={`Select ${name ?? id}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className={styles.cardCheckbox}
                          />
                        </button>
                      ) : null}
                      <div className={styles.cardContent}>
                        <div className={styles.cardHeaderRow}>
                          <div className={styles.cardHeaderLeft}>
                            <div className={styles.cardIconWrap}>
                              <DocumentIcon className={styles.cardIconSvg} strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <button onClick={() => setPreviewDoc(item)} className={styles.cardTitleBtn}>
                                {name ?? id ?? `Document`}
                              </button>
                            </div>
                          </div>
                          {id ? (
                            <button
                              onClick={() => setPreviewDoc(item)}
                              className={styles.previewBtn}
                              aria-label="Preview document"
                            >
                              <EyeIcon className={styles.previewBtnIcon} strokeWidth={2} />
                            </button>
                          ) : null}
                        </div>
                        <div className={styles.metaRow}>
                          {createdAt ? (
                            <p className={styles.dateText}>
                              {new Date(createdAt).toLocaleDateString(undefined, {
                                year: `numeric`,
                                month: `short`,
                                day: `numeric`,
                              })}
                            </p>
                          ) : null}
                          <span
                            className={`${styles.kindBadge} ${
                              kind === `Payment`
                                ? styles.kindPayment
                                : kind === `Compliance`
                                  ? styles.kindCompliance
                                  : kind === `Contract`
                                    ? styles.kindContract
                                    : styles.kindGeneral
                            }`}
                          >
                            {kind}
                          </span>
                        </div>
                        {tags.length > 0 ? (
                          <div className={styles.tagsRow}>
                            {tags.slice(0, 3).map((tag, index) => (
                              <span key={`${id}-tag-${index}`} className={styles.tagChip}>
                                {tag}
                              </span>
                            ))}
                            {tags.length > 3 ? <span className={styles.tagMore}>+{tags.length - 3}</span> : null}
                          </div>
                        ) : null}
                        {id ? (
                          <div className={styles.actionsGrid}>
                            <SegmentedButton
                              active={isSelected}
                              onClick={() => setEditingTagsFor(id)}
                              aria-label="Edit tags"
                            >
                              <TagIcon className="h-4 w-4" strokeWidth={2} />
                              <span>Tags</span>
                            </SegmentedButton>
                            <SegmentedButton
                              active={isSelected}
                              onClick={() => setAttachingDocId(id)}
                              aria-label="Attach to payment"
                            >
                              <PaperclipIcon className="h-4 w-4" strokeWidth={2.5} />
                              <span>Attach</span>
                            </SegmentedButton>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
        }}
        onConfirm={handleBulkDelete}
        title="Delete Documents"
        message={`Are you sure you want to delete ${selectedDocs.size} document${selectedDocs.size === 1 ? `` : `s`}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isPending}
        icon={
          <div className={styles.confirmIconWrap}>
            <TrashIcon className={styles.confirmIcon} />
          </div>
        }
      />
      {editingTagsFor ? (
        <TagEditor
          docId={editingTagsFor}
          initialTags={(items.find((i) => i.id === editingTagsFor)?.tags as string[]) ?? []}
          onClose={() => setEditingTagsFor(null)}
        />
      ) : null}

      {attachingDocId ? (
        <PaymentPickerModal documentId={attachingDocId} onClose={() => setAttachingDocId(null)} />
      ) : null}

      {previewDoc && (previewDoc.downloadUrl as string | undefined) ? (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentUrl={previewDoc.downloadUrl as string}
          documentName={(previewDoc.name as string) ?? `Document`}
          documentType={(previewDoc.mimetype as string) ?? `application/pdf`}
        />
      ) : null}
    </div>
  );
}
