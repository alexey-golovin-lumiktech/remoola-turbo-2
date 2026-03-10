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
        ${isFullscreen ? `bg-black` : `bg-slate-900/60 p-0 sm:p-4 backdrop-blur-md`}
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
          shadow-2xl
          ${isFullscreen ? `h-screen w-screen bg-slate-900` : `h-[95vh] w-full rounded-t-3xl sm:max-w-5xl sm:rounded-3xl bg-white dark:bg-slate-800`}
        `}
      >
        <div
          className={`
            flex
            flex-col
            border-b
            bg-linear-to-r
            from-white
            via-slate-50
            to-white
            px-3
            py-3
            sm:flex-row
            sm:items-center
            sm:px-5
            sm:py-4
            dark:border-slate-700
            dark:from-slate-800
            dark:via-slate-900
            dark:to-slate-800
            backdrop-blur-xs
          `}
        >
          <div
            className={`
              flex
              items-center
              justify-between
              gap-2
              mb-2
              sm:mb-0
              sm:flex-1
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
                  text-base
                  sm:text-lg
                  font-bold
                  text-slate-900
                  dark:text-white
                `}
              >
                {documentName}
              </h2>
            </div>

            {!isFullscreen && (
              <button
                onClick={onClose}
                className={`
                  shrink-0
                  min-h-10
                  sm:hidden
                  rounded-xl
                  p-2
                  text-slate-600
                  transition-all
                  hover:bg-slate-100
                  hover:text-slate-900
                  focus:outline-hidden
                  focus:ring-2
                  focus:ring-primary-500
                  dark:text-slate-400
                  dark:hover:bg-slate-700
                  dark:hover:text-white
                  active:scale-95
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

          <div
            className={`
              flex
              items-center
              justify-center
              gap-2
              sm:ml-4
            `}
          >
            <button
              onClick={handleDownload}
              className={`
                flex-1
                sm:flex-none
                min-h-10
                sm:min-h-11
                rounded-xl
                px-4
                py-2
                sm:p-2.5
                text-slate-600
                font-semibold
                sm:font-normal
                text-sm
                transition-all
                hover:bg-slate-100
                hover:text-slate-900
                hover:shadow-md
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                dark:text-slate-400
                dark:hover:bg-slate-700
                dark:hover:text-white
                active:scale-95
                flex
                items-center
                justify-center
                gap-2
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
              <span className={`sm:hidden`}>Download</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`
                flex-1
                sm:flex-none
                min-h-10
                sm:min-h-11
                rounded-xl
                px-4
                py-2
                sm:p-2.5
                text-slate-600
                font-semibold
                sm:font-normal
                text-sm
                transition-all
                hover:bg-slate-100
                hover:text-slate-900
                hover:shadow-md
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                dark:text-slate-400
                dark:hover:bg-slate-700
                dark:hover:text-white
                active:scale-95
                flex
                items-center
                justify-center
                gap-2
              `}
              aria-label={isFullscreen ? `Exit fullscreen` : `Enter fullscreen`}
            >
              {isFullscreen ? (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className={`sm:hidden`}>Exit</span>
                </>
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
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                  <span className={`sm:hidden`}>Fullscreen</span>
                </>
              )}
            </button>

            {!isFullscreen && (
              <button
                onClick={onClose}
                className={`
                  hidden
                  sm:flex
                  min-h-11
                  rounded-xl
                  p-2.5
                  text-slate-600
                  transition-all
                  hover:bg-slate-100
                  hover:text-slate-900
                  hover:shadow-md
                  focus:outline-hidden
                  focus:ring-2
                  focus:ring-primary-500
                  dark:text-slate-400
                  dark:hover:bg-slate-700
                  dark:hover:text-white
                  active:scale-95
                  items-center
                  justify-center
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
            bg-slate-50
            dark:bg-slate-950
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
                  h-20
                  w-20
                  items-center
                  justify-center
                  rounded-2xl
                  bg-linear-to-br
                  from-slate-200
                  to-slate-300
                  shadow-xl
                  dark:from-slate-700
                  dark:to-slate-800
                `}
              >
                <svg
                  className={`
                    h-10
                    w-10
                    text-slate-500
                    dark:text-slate-400
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
                  mt-6
                  text-base
                  font-bold
                  text-slate-900
                  dark:text-white
                `}
              >
                Preview not available
              </p>
              <p
                className={`
                  mt-2
                  text-sm
                  text-slate-600
                  dark:text-slate-400
                `}
              >
                Download the file to view it
              </p>
              <button
                onClick={handleDownload}
                className={`
                  mt-8
                  inline-flex
                  min-h-12
                  items-center
                  gap-2
                  rounded-xl
                  bg-linear-to-r
                  from-primary-600
                  to-primary-700
                  px-8
                  py-3
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  shadow-primary-500/30
                  transition-all
                  hover:shadow-xl
                  hover:shadow-primary-500/40
                  hover:scale-105
                  focus:outline-hidden
                  focus:ring-2
                  focus:ring-primary-500
                  focus:ring-offset-2
                  active:scale-95
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
