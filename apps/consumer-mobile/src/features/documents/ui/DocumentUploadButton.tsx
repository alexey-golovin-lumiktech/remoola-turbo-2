'use client';

import { useRef, useState } from 'react';

import { Button } from '../../../shared/ui/Button';

interface DocumentUploadButtonProps {
  onUploadComplete?: () => void;
}

/**
 * DocumentUploadButton - Mobile-friendly file upload
 * Supports multiple files with progress indication
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
          <span>Uploading {uploadProgress}%</span>
        ) : (
          <>
            <svg
              className={`
                mr-2
                h-5
                w-5
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </>
        )}
      </Button>
      {error && (
        <div
          className={`
            absolute
            top-full
            right-0
            mt-2
            w-64
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-3
            py-2
            text-sm
            text-red-800
            shadow-lg
            dark:border-red-900
            dark:bg-red-950
            dark:text-red-200
          `}
        >
          {error}
        </div>
      )}
    </div>
  );
}
