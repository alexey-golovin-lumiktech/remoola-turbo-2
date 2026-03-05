'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { bulkDeleteDocuments } from '../actions';
import { DocumentPreviewModal } from '../DocumentPreviewModal';
import { ConfirmationModal } from './ConfirmationModal';
import { DocumentFilterBar } from './DocumentFilterBar';
import { DocumentUploadButton } from './DocumentUploadButton';
import { PaymentPickerModal } from './PaymentPickerModal';
import { TagEditor } from './TagEditor';

import type { DocumentItem } from '../queries';
import type { DocumentKind } from '../schemas';

interface EnhancedDocumentsViewProps {
  items: DocumentItem[];
}

/**
 * EnhancedDocumentsView - Full-featured document management view
 * Features: upload, bulk delete, filter, attach to payment, tags, preview
 * Mobile-first with 44px touch targets
 */
export function EnhancedDocumentsView({ items }: EnhancedDocumentsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [filterKind, setFilterKind] = useState<DocumentKind>(`All`);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
      setDeleteError(null);
      startTransition(() => {
        router.refresh();
      });
    } else {
      showErrorToast(result.error.message, { code: result.error.code });
      setDeleteError(result.error.message);
    }
  };

  const handleUploadComplete = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  if (filteredItems.length === 0 && filterKind === `All`) {
    return (
      <div
        className={`
          space-y-4
        `}
      >
        <div
          className={`
            flex
            items-center
            justify-between
          `}
        >
          <h2
            className={`
              text-lg
              font-semibold
              text-slate-800
              dark:text-slate-200
            `}
          >
            Documents
          </h2>
          <DocumentUploadButton onUploadComplete={handleUploadComplete} />
        </div>
        <EmptyState
          icon={
            <svg
              className={`
                h-8
                w-8
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
          title="No documents yet"
          description="Upload documents to keep track of invoices, receipts, and contracts."
        />
      </div>
    );
  }

  return (
    <div
      className={`
        space-y-4
      `}
      data-testid="enhanced-documents-view"
    >
      <div
        className={`
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        `}
      >
        <h2
          className={`
            text-lg
            font-semibold
            text-slate-800
            dark:text-slate-200
          `}
        >
          Documents
        </h2>
        <DocumentUploadButton onUploadComplete={handleUploadComplete} />
      </div>

      <DocumentFilterBar activeFilter={filterKind} onFilterChange={setFilterKind} />

      {selectedDocs.size > 0 && (
        <div
          className={`
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-primary-200
            bg-primary-50
            px-4
            py-3
            dark:border-primary-900
            dark:bg-primary-950
          `}
        >
          <span
            className={`
              text-sm
              font-medium
              text-primary-900
              dark:text-primary-100
            `}
          >
            {selectedDocs.size} selected
          </span>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isPending}>
            Delete Selected
          </Button>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div
          className={`
            py-8
            text-center
          `}
        >
          <p
            className={`
              text-sm
              text-slate-500
              dark:text-slate-400
            `}
          >
            No documents found for this filter.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`
              flex
              items-center
              gap-3
              border-b
              border-slate-200
              pb-3
              dark:border-slate-700
            `}
          >
            <button
              onClick={handleToggleAll}
              className={`
                flex
                min-h-[44px]
                items-center
                gap-2
                rounded-lg
                px-3
                py-2
                text-sm
                font-medium
                text-slate-700
                transition-colors
                hover:bg-slate-100
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
                dark:text-slate-300
                dark:hover:bg-slate-800
              `}
              aria-label={allSelected ? `Deselect all` : `Select all`}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {}}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                className={`
                  h-5
                  w-5
                  rounded
                  border-slate-300
                  text-primary-600
                  focus:ring-primary-500
                  dark:border-slate-600
                `}
              />
              {allSelected ? `Deselect All` : `Select All`}
            </button>
          </div>

          <ul
            className={`
              space-y-3
            `}
          >
            {filteredItems.map((item) => {
              const id = item.id as string | undefined;
              const name = item.name as string | undefined;
              const createdAt = item.createdAt as string | undefined;
              const tags = (item.tags as string[]) ?? [];
              const kind = (item.kind as string) ?? `General`;
              const key = id ?? String(Math.random());
              const isSelected = id ? selectedDocs.has(id) : false;

              return (
                <li
                  key={key}
                  className={`
                    group
                    relative
                    overflow-hidden
                    rounded-xl
                    border
                    ${isSelected ? `border-primary-500 bg-primary-50 dark:border-primary-600 dark:bg-primary-950` : `border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800`}
                    p-4
                    shadow-sm
                    transition-all
                    duration-200
                    hover:shadow-md
                  `}
                >
                  <div
                    className={`
                      absolute
                      right-0
                      top-0
                      h-full
                      w-1
                      ${isSelected ? `bg-primary-500` : `bg-primary-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
                    `}
                  />
                  <div
                    className={`
                      flex
                      items-start
                      gap-3
                    `}
                  >
                    {id && (
                      <button
                        onClick={() => handleToggleDoc(id)}
                        className={`
                          mt-1
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500
                        `}
                        aria-label={`Select ${name ?? id}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className={`
                            h-5
                            w-5
                            rounded
                            border-slate-300
                            text-primary-600
                            focus:ring-primary-500
                            dark:border-slate-600
                          `}
                        />
                      </button>
                    )}
                    <div
                      className={`
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-slate-100
                        text-slate-600
                        dark:bg-slate-700
                        dark:text-slate-300
                      `}
                    >
                      <svg
                        className={`
                          h-5
                          w-5
                        `}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div
                      className={`
                        flex-1
                        min-w-0
                      `}
                    >
                      <button
                        onClick={() => setPreviewDoc(item)}
                        className={`
                          block
                          w-full
                          truncate
                          text-left
                          font-semibold
                          text-slate-900
                          transition-colors
                          hover:text-primary-600
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500
                          dark:text-white
                          dark:hover:text-primary-400
                        `}
                      >
                        {name ?? id ?? `Document`}
                      </button>
                      <div
                        className={`
                          mt-1
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        `}
                      >
                        {createdAt && (
                          <p
                            className={`
                              text-xs
                              text-slate-500
                              dark:text-slate-400
                            `}
                          >
                            {new Date(createdAt).toLocaleDateString(undefined, {
                              year: `numeric`,
                              month: `short`,
                              day: `numeric`,
                            })}
                          </p>
                        )}
                        <span
                          className={`
                            inline-flex
                            items-center
                            rounded-full
                            bg-slate-100
                            px-2
                            py-0.5
                            text-xs
                            font-medium
                            text-slate-700
                            dark:bg-slate-700
                            dark:text-slate-300
                          `}
                        >
                          {kind}
                        </span>
                      </div>
                      {tags.length > 0 && (
                        <div
                          className={`
                            mt-2
                            flex
                            flex-wrap
                            gap-1
                          `}
                        >
                          {tags.map((tag, index) => (
                            <span
                              key={`${id}-tag-${index}`}
                              className={`
                                inline-flex
                                items-center
                                rounded-md
                                bg-primary-100
                                px-2
                                py-0.5
                                text-xs
                                font-medium
                                text-primary-700
                                dark:bg-primary-900
                                dark:text-primary-300
                              `}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div
                        className={`
                          mt-3
                          flex
                          gap-2
                        `}
                      >
                        {id && (
                          <>
                            <button
                              onClick={() => setEditingTagsFor(id)}
                              className={`
                                flex-1
                                min-h-[44px]
                                rounded-lg
                                border
                                border-slate-300
                                bg-white
                                px-3
                                py-2
                                text-sm
                                font-medium
                                text-slate-700
                                transition-colors
                                hover:bg-slate-50
                                hover:border-slate-400
                                focus:outline-none
                                focus:ring-2
                                focus:ring-primary-500
                                dark:border-slate-600
                                dark:bg-slate-700
                                dark:text-slate-300
                                dark:hover:bg-slate-600
                              `}
                            >
                              <svg
                                className={`
                                  mr-2
                                  inline-block
                                  h-4
                                  w-4
                                `}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              Tags
                            </button>
                            <button
                              onClick={() => setAttachingDocId(id)}
                              className={`
                                flex-1
                                min-h-[44px]
                                rounded-lg
                                border
                                border-slate-300
                                bg-white
                                px-3
                                py-2
                                text-sm
                                font-medium
                                text-slate-700
                                transition-colors
                                hover:bg-slate-50
                                hover:border-slate-400
                                focus:outline-none
                                focus:ring-2
                                focus:ring-primary-500
                                dark:border-slate-600
                                dark:bg-slate-700
                                dark:text-slate-300
                                dark:hover:bg-slate-600
                              `}
                            >
                              <svg
                                className={`
                                  mr-2
                                  inline-block
                                  h-4
                                  w-4
                                `}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                              </svg>
                              Attach
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {id && (
                      <button
                        onClick={() => setPreviewDoc(item)}
                        className={`
                          shrink-0
                          rounded-lg
                          p-2
                          text-slate-400
                          transition-colors
                          hover:bg-slate-100
                          hover:text-slate-600
                          focus:outline-none
                          focus:ring-2
                          focus:ring-primary-500
                          dark:hover:bg-slate-700
                          dark:hover:text-slate-300
                        `}
                        aria-label="Preview document"
                      >
                        <svg
                          className={`
                            h-5
                            w-5
                          `}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteError(null);
        }}
        onConfirm={handleBulkDelete}
        title="Delete Documents"
        message={`Are you sure you want to delete ${selectedDocs.size} document${selectedDocs.size === 1 ? `` : `s`}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isPending}
        icon={
          <div
            className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-red-100
              dark:bg-red-900
            `}
          >
            <svg
              className={`
                h-6
                w-6
                text-red-600
                dark:text-red-400
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        }
      />
      {deleteError && (
        <div
          className={`
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-800
            dark:border-red-900
            dark:bg-red-950
            dark:text-red-200
          `}
        >
          {deleteError}
        </div>
      )}

      {editingTagsFor && (
        <TagEditor
          docId={editingTagsFor}
          initialTags={(items.find((i) => i.id === editingTagsFor)?.tags as string[]) ?? []}
          onClose={() => setEditingTagsFor(null)}
        />
      )}

      {attachingDocId && <PaymentPickerModal documentId={attachingDocId} onClose={() => setAttachingDocId(null)} />}

      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentUrl={(previewDoc.url as string) ?? ``}
          documentName={(previewDoc.name as string) ?? `Document`}
          documentType={(previewDoc.mimeType as string) ?? `application/pdf`}
        />
      )}
    </div>
  );
}
