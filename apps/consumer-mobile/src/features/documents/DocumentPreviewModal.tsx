'use client';

import { useEffect, useState } from 'react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType?: string;
}

/**
 * DocumentPreviewModal - Preview documents with fullscreen support
 * Bottom sheet on mobile, centered modal on desktop
 * Supports images, PDFs, and other document types
 */
export function DocumentPreviewModal({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentType = `application/pdf`,
}: DocumentPreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = `hidden`;
    } else {
      document.body.style.overflow = ``;
      setIsFullscreen(false);
    }

    return () => {
      document.body.style.overflow = ``;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === `Escape` && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener(`keydown`, handleEscape);
    return () => document.removeEventListener(`keydown`, handleEscape);
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen) return null;

  if (!documentUrl) return null;

  const isImage = documentType?.startsWith(`image/`);
  const isPdf = documentType === `application/pdf`;

  const handleDownload = () => {
    const link = document.createElement(`a`);
    link.href = documentUrl;
    link.download = documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`
        fixed
        inset-0
        z-50
        flex
        items-end
        justify-center
        sm:items-center
        ${isFullscreen ? `bg-black` : `bg-slate-900/50 p-0 sm:p-4 backdrop-blur-sm`}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
    >
      {!isFullscreen && (
        <div
          className={`
            fixed
            inset-0
          `}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`
          relative
          z-10
          flex
          flex-col
          overflow-hidden
          bg-white
          shadow-xl
          dark:bg-slate-800
          ${isFullscreen ? `h-screen w-screen` : `h-[90vh] w-full rounded-t-2xl sm:max-w-4xl sm:rounded-2xl`}
        `}
      >
        <div
          className={`
            flex
            items-center
            justify-between
            border-b
            border-slate-200
            px-4
            py-3
            dark:border-slate-700
          `}
        >
          <div
            className={`
              flex-1
              min-w-0
            `}
          >
            <h2
              id="document-preview-title"
              className={`
                truncate
                text-lg
                font-semibold
                text-slate-900
                dark:text-white
              `}
            >
              {documentName}
            </h2>
          </div>

          <div
            className={`
              flex
              items-center
              gap-2
              ml-4
            `}
          >
            <button
              onClick={handleDownload}
              className={`
                min-h-[44px]
                rounded-lg
                p-2
                text-slate-600
                transition-colors
                hover:bg-slate-100
                hover:text-slate-900
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
                dark:text-slate-400
                dark:hover:bg-slate-700
                dark:hover:text-white
              `}
              aria-label="Download document"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`
                min-h-[44px]
                rounded-lg
                p-2
                text-slate-600
                transition-colors
                hover:bg-slate-100
                hover:text-slate-900
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
                dark:text-slate-400
                dark:hover:bg-slate-700
                dark:hover:text-white
              `}
              aria-label={isFullscreen ? `Exit fullscreen` : `Enter fullscreen`}
            >
              {isFullscreen ? (
                <svg
                  className={`
                    h-5
                    w-5
                  `}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
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
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>

            {!isFullscreen && (
              <button
                onClick={onClose}
                className={`
                  min-h-[44px]
                  rounded-lg
                  p-2
                  text-slate-600
                  transition-colors
                  hover:bg-slate-100
                  hover:text-slate-900
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary-500
                  dark:text-slate-400
                  dark:hover:bg-slate-700
                  dark:hover:text-white
                `}
                aria-label="Close preview"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div
          className={`
            flex-1
            overflow-auto
            bg-slate-100
            dark:bg-slate-900
          `}
        >
          {isImage ? (
            <div
              className={`
                flex
                h-full
                items-center
                justify-center
                p-4
              `}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={documentUrl}
                alt={documentName}
                className={`
                  max-h-full
                  max-w-full
                  object-contain
                `}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={documentUrl}
              title={documentName}
              className={`
                h-full
                w-full
              `}
              frameBorder="0"
            />
          ) : (
            <div
              className={`
                flex
                h-full
                flex-col
                items-center
                justify-center
                p-8
                text-center
              `}
            >
              <div
                className={`
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-slate-200
                  dark:bg-slate-700
                `}
              >
                <svg
                  className={`
                    h-8
                    w-8
                    text-slate-500
                  `}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p
                className={`
                  mt-4
                  text-sm
                  font-medium
                  text-slate-900
                  dark:text-white
                `}
              >
                Preview not available
              </p>
              <p
                className={`
                  mt-1
                  text-xs
                  text-slate-600
                  dark:text-slate-400
                `}
              >
                Download the file to view it
              </p>
              <button
                onClick={handleDownload}
                className={`
                  mt-6
                  inline-flex
                  min-h-[44px]
                  items-center
                  rounded-lg
                  bg-primary-600
                  px-6
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:bg-primary-700
                  hover:shadow-md
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary-500
                  focus:ring-offset-2
                `}
              >
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
