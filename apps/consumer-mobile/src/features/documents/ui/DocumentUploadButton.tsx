'use client';

import { useRef, useState } from 'react';

import { Button } from '../../../shared/ui/Button';

interface DocumentUploadButtonProps {
  onUploadComplete?: () => void;
}

/**
 * DocumentUploadButton - Mobile-friendly file upload
 * Supports multiple files with progress indication
 * Enhanced visual feedback for better UX
 */
export function DocumentUploadButton({ onUploadComplete }: DocumentUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 10) {
      setError(`Maximum 10 files allowed`);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append(`files`, file);
      });

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener(`progress`, (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      xhr.addEventListener(`load`, () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setIsUploading(false);
          setUploadProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = ``;
          }
          onUploadComplete?.();
        } else {
          setIsUploading(false);
          setUploadProgress(0);
          setError(`Upload failed. Please try again.`);
        }
      });

      xhr.addEventListener(`error`, () => {
        setIsUploading(false);
        setUploadProgress(0);
        setError(`Network error. Please check your connection.`);
      });

      xhr.open(`POST`, `/api/documents/upload`);
      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      setError(err instanceof Error ? err.message : `Upload failed`);
    }
  };

  return (
    <div
      className={`
        relative
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
        className={`
          hidden
        `}
        aria-label="Upload documents"
      />
      <Button onClick={handleClick} disabled={isUploading} isLoading={isUploading} variant="primary" size="md">
        {isUploading ? (
          <div
            className={`
              flex
              items-center
              gap-2
            `}
          >
            <svg
              className={`
                h-5
                w-5
                animate-spin
              `}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-semibold">{uploadProgress}%</span>
          </div>
        ) : (
          <>
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="ml-2 font-semibold">Upload</span>
          </>
        )}
      </Button>
      {error && (
        <div
          className={`
            absolute
            top-full
            right-0
            z-50
            mt-2
            w-64
            animate-slideDown
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            font-medium
            text-red-800
            shadow-lg
            dark:border-red-900
            dark:bg-red-950
            dark:text-red-200
          `}
        >
          <div
            className={`
              flex
              items-start
              gap-2
            `}
          >
            <svg
              className={`
                h-5
                w-5
                shrink-0
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
