'use client';

import { useEffect, useState } from 'react';

import { cn } from '@remoola/ui';

import localStyles from './DocumentPreviewModal.module.css';
import { useFullscreen } from './useFullscreen';
import { useResizable } from './useResizable';
import styles from '../ui/classNames.module.css';

const {
  docPreviewActionButton,
  docPreviewActionButtonSquare,
  docPreviewActions,
  docPreviewCloseButton,
  docPreviewContent,
  docPreviewDocument,
  docPreviewDragHandle,
  docPreviewDragHandleIcon,
  docPreviewFullscreen,
  docPreviewIframe,
  docPreviewImage,
  docPreviewMeta,
  docPreviewModal,
  docPreviewOverlay,
  docPreviewSidebar,
  docPreviewSidebarLabel,
  docPreviewTitle,
  docPreviewTopbar,
  docPreviewZoomLabel,
} = styles;

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  doc: {
    id: string;
    name: string;
    size: number;
    createdAt: string;
    downloadUrl: string;
    mimetype: string | null;
    kind: string;
    tags: string[];
  };
}

export function DocumentPreviewModal({ open, onClose, doc }: DocumentPreviewModalProps) {
  const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreen();

  const { size, startDragging } = useResizable({
    minWidth: 280,
    minHeight: 320,
    maxWidth: 1600,
    maxHeight: 1200,
    initialWidth: 900,
    initialHeight: 600,
  });

  const [zoom, setZoom] = useState(1.0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [canShowSidebar, setCanShowSidebar] = useState(false);

  const ZOOM_STEP = 0.1;
  const mimeType = doc.mimetype ?? ``;
  const isPDF = mimeType === `application/pdf`;
  const isImage = mimeType.startsWith(`image/`);
  const supportsInlinePreview = isPDF || isImage;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === `Escape`) onClose();
    };
    window.addEventListener(`keydown`, handleEsc);
    return () => window.removeEventListener(`keydown`, handleEsc);
  }, [onClose]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: 768px)`);
    const syncSidebarAvailability = () => setCanShowSidebar(mediaQuery.matches);

    syncSidebarAvailability();
    mediaQuery.addEventListener(`change`, syncSidebarAvailability);

    return () => mediaQuery.removeEventListener(`change`, syncSidebarAvailability);
  }, []);

  if (!open) return null;

  return (
    <div className={cn(docPreviewOverlay, localStyles.overlay)}>
      <div
        ref={fullscreenRef}
        className={cn(docPreviewModal, localStyles.modalFrame, isFullscreen && docPreviewFullscreen)}
        style={
          !isFullscreen
            ? {
                width: size.width,
                height: size.height,
                maxWidth: `calc(100vw - 1rem)`,
                maxHeight: `calc(100dvh - 1rem)`,
              }
            : {}
        }
      >
        {/* Top bar */}
        <div className={cn(docPreviewTopbar, localStyles.topbar)}>
          <div className={localStyles.headerInfo}>
            <div className={cn(docPreviewTitle, localStyles.title)}>{doc.name}</div>
            <div className={cn(docPreviewMeta, localStyles.meta)}>
              {(mimeType || `Unknown file type`) + ` — ` + `${(doc.size / 1024).toFixed(1)} KB`}
            </div>
          </div>

          <div className={cn(docPreviewActions, localStyles.actions)}>
            {/* Thumbnail toggle */}
            {isPDF && canShowSidebar && (
              <button
                onClick={(e) => (e.preventDefault(), e.stopPropagation(), setShowThumbnails((x) => !x))}
                className={docPreviewActionButton}
              >
                {showThumbnails ? `Hide Thumbs` : `Show Thumbs`}
              </button>
            )}

            {/* Zoom controls */}
            {supportsInlinePreview ? (
              <div className={localStyles.zoomControls}>
                <button
                  onClick={(e) => (
                    e.preventDefault(),
                    e.stopPropagation(),
                    setZoom((z) => Math.max(0.4, z - ZOOM_STEP))
                  )}
                  className={docPreviewActionButtonSquare}
                >
                  –
                </button>
                <span className={docPreviewZoomLabel}>{Math.round(zoom * 100)}%</span>
                <button
                  onClick={(e) => (e.preventDefault(), e.stopPropagation(), setZoom((z) => Math.min(3, z + ZOOM_STEP)))}
                  className={docPreviewActionButtonSquare}
                >
                  +
                </button>
              </div>
            ) : null}

            {/* Fit to width */}
            {supportsInlinePreview && (
              <button
                onClick={(e) => (e.preventDefault(), e.stopPropagation(), setZoom(1))}
                className={docPreviewActionButton}
              >
                Fit
              </button>
            )}

            {/* Download */}

            <a href={doc.downloadUrl} download={doc.name} className={docPreviewActionButton}>
              Download
            </a>

            {/* Print */}
            {supportsInlinePreview && (
              <button
                onClick={(e) => (
                  e.preventDefault(),
                  e.stopPropagation(),
                  window.open(doc.downloadUrl, `_blank`)?.print?.()
                )}
                className={docPreviewActionButton}
              >
                Print
              </button>
            )}

            {/* Fullscreen */}
            {supportsInlinePreview && (
              <button onClick={toggleFullscreen} className={docPreviewActionButton}>
                {isFullscreen ? `Exit Fullscreen` : `Fullscreen`}
              </button>
            )}

            {/* Close */}
            <button onClick={onClose} className={docPreviewCloseButton}>
              ×
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className={cn(docPreviewContent, localStyles.content)}>
          {/* Sidebar thumbnails */}
          {showThumbnails && isPDF && canShowSidebar && (
            <div className={docPreviewSidebar}>
              {/* Placeholder for real thumbnails, can integrate PDF.js */}
              <div className={docPreviewSidebarLabel}>Thumbnails</div>
            </div>
          )}

          {/* Document */}
          <div className={cn(docPreviewDocument, localStyles.documentArea)}>
            {isPDF && (
              <iframe
                src={doc.downloadUrl}
                className={docPreviewIframe}
                style={{ transform: `scale(${zoom})`, transformOrigin: `top center` }}
              />
            )}

            {isImage && (
              /* eslint-disable @next/next/no-img-element */
              <img
                src={doc.downloadUrl}
                alt={doc.name}
                className={docPreviewImage}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: `top center`,
                  maxWidth: `100%`,
                  maxHeight: `100%`,
                }}
              />
            )}

            {!supportsInlinePreview && (
              <div className={localStyles.unsupportedState}>
                <div className={localStyles.unsupportedTitle}>Preview unavailable</div>
                <div className={localStyles.unsupportedText}>
                  This file type can&apos;t be previewed inline on mobile. Download it to inspect the document.
                </div>
                <a href={doc.downloadUrl} download={doc.name} className={docPreviewActionButton}>
                  Download file
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Drag handle */}
        {!isFullscreen && (
          <div onMouseDown={startDragging} className={cn(docPreviewDragHandle, localStyles.dragHandle)}>
            <div className={docPreviewDragHandleIcon} />
          </div>
        )}
      </div>
    </div>
  );
}
