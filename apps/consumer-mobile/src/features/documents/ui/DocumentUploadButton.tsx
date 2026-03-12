'use client';

import { useRef, useState } from 'react';

import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { UploadIcon } from '../../../shared/ui/icons/UploadIcon';

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

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 10) {
      showWarningToast(`Maximum 10 files allowed`);
      return;
    }

    setIsUploading(true);
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
          showSuccessToast(`${files.length} file${files.length > 1 ? `s` : ``} uploaded successfully`);
          onUploadComplete?.();
        } else {
          setIsUploading(false);
          setUploadProgress(0);
          clientLogger.error(`Document upload failed`, {
            status: xhr.status,
            fileCount: files.length,
          });
          showErrorToast(getLocalToastMessage(localToastKeys.DOCUMENTS_UPLOAD_FAILED));
        }
      });

      xhr.addEventListener(`error`, () => {
        setIsUploading(false);
        setUploadProgress(0);
        clientLogger.error(`Document upload network error`, {
          fileCount: files.length,
        });
        showErrorToast(getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR));
      });

      xhr.open(`POST`, `/api/documents/upload`);
      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      clientLogger.error(`Document upload exception`, {
        error: err,
        fileCount: files.length,
      });
      showErrorToast(getLocalToastMessage(localToastKeys.DOCUMENTS_UPLOAD_FAILED));
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
      <Button
        onClick={handleClick}
        disabled={isUploading}
        isLoading={isUploading}
        variant="primary"
        size="md"
        className={`
          shadow-xl
          shadow-primary-500/30
          hover:shadow-2xl
          hover:shadow-primary-500/40
        `}
      >
        {isUploading ? (
          <div
            className={`
              flex
              items-center
              gap-2.5
            `}
          >
            <SpinnerIcon className={`h-5 w-5 animate-spin`} />
            <span className={`font-bold`}>{uploadProgress}%</span>
          </div>
        ) : (
          <>
            <UploadIcon className={`h-5 w-5`} strokeWidth={2.5} />
            <span className={`ml-2 font-bold`}>Upload</span>
          </>
        )}
      </Button>
    </div>
  );
}
