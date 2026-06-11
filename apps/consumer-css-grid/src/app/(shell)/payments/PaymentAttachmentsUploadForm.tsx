'use client';

import Link from 'next/link';
import { type RefObject } from 'react';

export function PaymentAttachmentsUploadForm({
  documentsButtonLabel,
  documentsHref,
  isPending,
  onFilesSelected,
  onUpload,
  selectedFiles,
  uploadInputRef,
}: {
  documentsButtonLabel: string;
  documentsHref: string;
  isPending: boolean;
  onFilesSelected: (fileNames: string[]) => void;
  onUpload: () => void;
  selectedFiles: string[];
  uploadInputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
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
          onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []).map((file) => file.name))}
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
            onClick={onUpload}
            className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? `Uploading...` : selectedFiles.length === 0 ? `Select files` : `Upload to draft`}
          </button>
          <Link
            href={documentsHref}
            className="rounded-2xl border border-(--app-border) px-4 py-3 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text)"
          >
            {documentsButtonLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
