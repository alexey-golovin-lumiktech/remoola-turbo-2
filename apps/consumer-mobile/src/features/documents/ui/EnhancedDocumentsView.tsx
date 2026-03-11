'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmationModal } from './ConfirmationModal';
import { DocumentFilterBar } from './DocumentFilterBar';
import { DocumentUploadButton } from './DocumentUploadButton';
import { PaymentPickerModal } from './PaymentPickerModal';
import { TagEditor } from './TagEditor';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { EyeIcon } from '../../../shared/ui/icons/EyeIcon';
import { PaperclipIcon } from '../../../shared/ui/icons/PaperclipIcon';
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon';
import { TagIcon } from '../../../shared/ui/icons/TagIcon';
import { TrashIcon } from '../../../shared/ui/icons/TrashIcon';
import { bulkDeleteDocuments } from '../actions';
import { DocumentPreviewModal } from '../DocumentPreviewModal';
import { type DocumentItem } from '../queries';
import { type DocumentKind } from '../schemas';

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
          space-y-6
          animate-fadeIn
        `}
      >
        <div className={`flex flex-col gap-4`}>
          <DocumentFilterBar activeFilter={filterKind} onFilterChange={setFilterKind} filterCounts={filterCounts} />
          <div className={`flex justify-center sm:justify-end`}>
            <DocumentUploadButton onUploadComplete={handleUploadComplete} />
          </div>
        </div>
        <div
          className={`
            rounded-3xl
            border-2
            border-dashed
            border-slate-300/50
            bg-linear-to-br
            from-slate-100/50
            via-white
            to-slate-100/50
            px-8
            py-20
            text-center
            shadow-2xl
            dark:border-slate-700/50
            dark:from-slate-800/30
            dark:via-slate-900/50
            dark:to-slate-800/30
            sm:px-10
            sm:py-24
            backdrop-blur-xs
          `}
        >
          <div
            className={`
            mx-auto
            mb-8
            flex
            h-24
            w-24
            items-center
            justify-center
            rounded-3xl
            bg-linear-to-br
            from-slate-200
            via-slate-100
            to-slate-200
            text-slate-400
            shadow-2xl
            ring-4
            ring-slate-200/50
            dark:from-slate-700
            dark:via-slate-800
            dark:to-slate-700
            dark:text-slate-500
            dark:ring-slate-700/50
          `}
          >
            <DocumentIcon className={`h-12 w-12`} strokeWidth={1.5} />
          </div>
          <EmptyState
            icon={null}
            title="No documents yet"
            description="Upload documents to keep track of invoices, receipts, and contracts."
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        space-y-6
        animate-fadeIn
      `}
      data-testid="enhanced-documents-view"
    >
      <div className={`flex flex-col gap-4`}>
        <DocumentFilterBar activeFilter={filterKind} onFilterChange={setFilterKind} filterCounts={filterCounts} />
        <div className={`flex justify-center sm:justify-end`}>
          <DocumentUploadButton onUploadComplete={handleUploadComplete} />
        </div>
      </div>

      {selectedDocs.size > 0 && (
        <div
          className={`
            animate-slideDown
            flex
            items-center
            justify-between
            rounded-2xl
            border
            border-primary-500/20
            bg-linear-to-r
            from-primary-600
            via-primary-700
            to-primary-600
            px-5
            py-4
            shadow-xl
            shadow-primary-500/30
            dark:border-primary-500/30
            dark:from-primary-800
            dark:via-primary-900
            dark:to-primary-800
            dark:shadow-primary-900/40
            backdrop-blur-xs
          `}
        >
          <div className={`flex items-center gap-3`}>
            <div
              className={`
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-white/20
              text-white
              shadow-lg
              backdrop-blur-xs
            `}
            >
              <CheckIcon className={`h-5 w-5`} strokeWidth={2.5} />
            </div>
            <span className={`text-sm font-bold text-white`}>
              {selectedDocs.size} document{selectedDocs.size === 1 ? `` : `s`} selected
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isPending}>
            <TrashIcon className={`mr-1.5 h-4 w-4`} />
            Delete
          </Button>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div
          className={`
            animate-fadeIn
            flex
            min-h-100
            flex-col
            items-center
            justify-center
            rounded-3xl
            border-2
            border-dashed
            border-slate-300/50
            bg-linear-to-br
            from-slate-100/50
            via-white
            to-slate-100/50
            px-8
            py-20
            text-center
            shadow-2xl
            dark:border-slate-700/50
            dark:from-slate-800/30
            dark:via-slate-900/50
            dark:to-slate-800/30
            sm:min-h-112.5
            backdrop-blur-xs
          `}
        >
          <div
            className={`
              mb-8
              flex
              h-24
              w-24
              items-center
              justify-center
              rounded-3xl
              bg-linear-to-br
              from-slate-200
              via-slate-100
              to-slate-200
              text-slate-400
              shadow-2xl
              ring-4
              ring-slate-200/50
              dark:from-slate-700
              dark:via-slate-800
              dark:to-slate-700
              dark:text-slate-500
              dark:ring-slate-700/50
            `}
          >
            <SearchIcon className={`h-12 w-12`} strokeWidth={1.5} />
          </div>
          <h3
            className={`
              text-2xl
              font-bold
              text-slate-900
              dark:text-white
            `}
          >
            No documents found
          </h3>
          <p
            className={`
              mt-4
              max-w-sm
              text-base
              text-slate-600
              dark:text-slate-400
            `}
          >
            Try adjusting your filter or upload new documents to get started.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`
              flex
              items-center
              justify-between
              rounded-2xl
              border
              border-slate-200/50
              bg-linear-to-r
              from-slate-50
              via-white
              to-slate-50
              px-5
              py-4
              shadow-md
              dark:border-slate-700/50
              dark:from-slate-800/50
              dark:via-slate-800/30
              dark:to-slate-800/50
              backdrop-blur-xs
            `}
          >
            <button
              onClick={handleToggleAll}
              className={`
                flex
                min-h-11
                items-center
                gap-3
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-semibold
                text-slate-700
                transition-all
                duration-200
                hover:bg-slate-100
                active:scale-95
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                focus:ring-offset-2
                dark:text-slate-200
                dark:hover:bg-slate-700/50
                hover:shadow-xs
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
                  rounded-lg
                  border-2
                  border-slate-300
                  text-primary-600
                  transition-all
                  focus:ring-primary-500
                  dark:border-slate-600
                  cursor-pointer
                `}
              />
              <span>{allSelected ? `Deselect All` : `Select All`}</span>
            </button>
            <span
              className={`
                rounded-full
                bg-linear-to-r
                from-slate-200
                to-slate-300
                px-4
                py-2
                text-xs
                font-extrabold
                text-slate-700
                shadow-xs
                dark:from-slate-700
                dark:to-slate-800
                dark:text-slate-200
              `}
            >
              {filteredItems.length} document{filteredItems.length === 1 ? `` : `s`}
            </span>
          </div>

          <div
            className={`
              space-y-4
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
                <div
                  key={key}
                  className={`
                    group
                    relative
                    overflow-hidden
                    rounded-2xl
                    transition-all
                    duration-300
                    ${
                      isSelected
                        ? `bg-linear-to-br from-primary-600 via-primary-700 to-primary-800 shadow-2xl shadow-primary-500/40 border border-primary-500/30 scale-[1.02]`
                        : `bg-linear-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700/50 hover:border-slate-600 shadow-xl hover:shadow-2xl hover:scale-[1.01]`
                    }
                  `}
                >
                  <div
                    className={`
                      absolute
                      inset-0
                      bg-linear-to-br
                      from-transparent
                      via-transparent
                      to-black/10
                      pointer-events-none
                    `}
                  />
                  <div className={`p-5 relative z-10`}>
                    <div className={`flex items-start gap-4`}>
                      {id && (
                        <button
                          onClick={() => handleToggleDoc(id)}
                          className={`
                            mt-0.5
                            transition-transform
                            active:scale-90
                            focus:outline-hidden
                            focus:ring-2
                            focus:ring-white/50
                            focus:ring-offset-2
                            focus:ring-offset-slate-900
                            rounded-lg
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
                              rounded-lg
                              border-2
                              text-primary-600
                              transition-all
                              focus:ring-white/50
                              cursor-pointer
                              ${isSelected ? `border-white/50 bg-white/20` : `border-slate-600 bg-slate-800/50`}
                            `}
                          />
                        </button>
                      )}
                      <div className={`flex-1 min-w-0`}>
                        <div
                          className={`
                            flex
                            items-center
                            justify-between
                            gap-4
                            mb-3
                          `}
                        >
                          <div
                            className={`
                            flex
                            items-center
                            gap-3
                            flex-1
                            min-w-0
                          `}
                          >
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg transition-all duration-300 ${isSelected ? `bg-white/20 text-white backdrop-blur-xs ring-2 ring-white/30` : `bg-slate-700/80 text-slate-300 group-hover:bg-slate-600 backdrop-blur-xs`}`}
                            >
                              <DocumentIcon className={`h-6 w-6`} strokeWidth={2} />
                            </div>
                            <div className={`flex-1 min-w-0`}>
                              <button
                                onClick={() => setPreviewDoc(item)}
                                className={`
                                  block
                                  w-full
                                  truncate
                                  text-left
                                  text-base
                                  font-bold
                                  transition-colors
                                  focus:outline-hidden
                                  focus:ring-2
                                  focus:ring-white/50
                                  focus:ring-offset-2
                                  focus:ring-offset-slate-900
                                  rounded-lg
                                  px-1
                                  py-0.5
                                  ${isSelected ? `text-white` : `text-slate-100 hover:text-white`}
                                `}
                              >
                                {name ?? id ?? `Document`}
                              </button>
                            </div>
                          </div>
                          {id && (
                            <button
                              onClick={() => setPreviewDoc(item)}
                              className={`shrink-0 rounded-xl p-2.5 transition-all duration-200 active:scale-90 focus:outline-hidden focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-md ${isSelected ? `bg-white/10 text-white hover:bg-white/20 backdrop-blur-xs` : `text-slate-300 hover:bg-slate-700/50 hover:text-white backdrop-blur-xs`}`}
                              aria-label="Preview document"
                            >
                              <EyeIcon className={`h-5 w-5`} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                        <div
                          className={`
                            flex
                            flex-wrap
                            items-center
                            gap-2.5
                            mb-3.5
                          `}
                        >
                          {createdAt && (
                            <p className={`text-xs font-semibold ${isSelected ? `text-white/90` : `text-slate-400`}`}>
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
                              px-3
                              py-1.5
                              text-xs
                              font-extrabold
                              shadow-md
                              ${
                                kind === `Payment`
                                  ? `bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30`
                                  : kind === `Compliance`
                                    ? `bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30`
                                    : kind === `Contract`
                                      ? `bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30`
                                      : `bg-slate-600/30 text-slate-300 ring-1 ring-slate-500/30`
                              }
                            `}
                          >
                            {kind}
                          </span>
                        </div>
                        {tags.length > 0 && (
                          <div
                            className={`
                              flex
                              flex-wrap
                              gap-2
                              mb-4
                            `}
                          >
                            {tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={`${id}-tag-${index}`}
                                className={`
                                  inline-flex
                                  items-center
                                  rounded-lg
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-semibold
                                  shadow-xs
                                  ${isSelected ? `bg-white/15 text-white ring-1 ring-white/20` : `bg-slate-700/60 text-slate-300 ring-1 ring-slate-600/50`}
                                `}
                              >
                                {tag}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span
                                className={`
                                  inline-flex
                                  items-center
                                  rounded-lg
                                  px-2.5
                                  py-1
                                  text-xs
                                  font-semibold
                                  bg-slate-700/40
                                  text-slate-400
                                  ring-1
                                  ring-slate-600/50
                                `}
                              >
                                +{tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {id && (
                          <div className={`grid grid-cols-2 gap-3`}>
                            <button
                              onClick={() => setEditingTagsFor(id)}
                              // eslint-disable-next-line max-len
                              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-md ${isSelected ? `border-white/30 bg-white/10 text-white hover:bg-white/15 backdrop-blur-xs` : `border-slate-600/50 bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/50 backdrop-blur-xs`}`}
                            >
                              <TagIcon className={`h-4 w-4`} strokeWidth={2} />
                              <span>Tags</span>
                            </button>
                            <button
                              onClick={() => setAttachingDocId(id)}
                              className={`flex
                                min-h-11
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                px-4
                                py-2.5
                                text-sm
                                font-bold
                                transition-all
                                duration-200
                                active:scale-95
                                focus:outline-hidden
                                focus:ring-2
                                focus:ring-white/50
                                focus:ring-offset-2
                                focus:ring-offset-slate-900
                                shadow-md
                                ${isSelected ? `border-white/30 bg-white/10 text-white hover:bg-white/15 backdrop-blur-xs` : `border-slate-600/50 bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/50 backdrop-blur-xs`}`}
                            >
                              <PaperclipIcon className={`h-4 w-4`} strokeWidth={2.5} />
                              <span>Attach</span>
                            </button>
                          </div>
                        )}
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
            <TrashIcon
              className={`
                h-6
                w-6
                text-red-600
                dark:text-red-400
              `}
            />
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

      {previewDoc && (previewDoc.downloadUrl as string | undefined) && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          documentUrl={previewDoc.downloadUrl as string}
          documentName={(previewDoc.name as string) ?? `Document`}
          documentType={(previewDoc.mimetype as string) ?? `application/pdf`}
        />
      )}
    </div>
  );
}
