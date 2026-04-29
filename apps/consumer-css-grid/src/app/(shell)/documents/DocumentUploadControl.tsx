import { type RefObject } from 'react';

import { getSelectedFilesMessage } from './document-upload-helpers';

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  selectedFiles: string[];
  onFilesSelected: (files: string[]) => void;
  onUpload: () => void;
};

export function DocumentUploadControl({ inputRef, isPending, selectedFiles, onFilesSelected, onUpload }: Props) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        className="max-w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []).map((file) => file.name))}
      />
      <div className="mb-4 text-sm text-white/45">{getSelectedFilesMessage(selectedFiles)}</div>
      <button
        type="button"
        disabled={isPending || selectedFiles.length === 0}
        onClick={onUpload}
        className="mb-5 rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `Uploading...` : selectedFiles.length === 0 ? `Select files to upload` : `Upload documents`}
      </button>
    </>
  );
}
