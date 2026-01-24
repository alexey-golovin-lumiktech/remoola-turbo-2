'use client';

import { useEffect, useState } from 'react';

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
  flexRowItemsCenter,
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

  const { size, startDragging } = useResizable({ minWidth: 400, minHeight: 300, maxWidth: 1600, maxHeight: 1200 });

  const [zoom, setZoom] = useState(1.0);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const ZOOM_STEP = 0.1;

  const isPDF = doc.mimetype! === `application/pdf`;
  const isImage = doc.mimetype!.startsWith(`image/`);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === `Escape`) onClose();
    };
    window.addEventListener(`keydown`, handleEsc);
    return () => window.removeEventListener(`keydown`, handleEsc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className={docPreviewOverlay}>
      <div
        ref={fullscreenRef}
        className={`${docPreviewModal} ${isFullscreen ? docPreviewFullscreen : ``}`}
        style={!isFullscreen ? { width: size.width, height: size.height } : {}}
      >
        {/* Top bar */}
        <div className={docPreviewTopbar}>
          <div>
            <div className={docPreviewTitle}>{doc.name}</div>
            <div className={docPreviewMeta}>
              {doc.mimetype} — {(doc.size / 1024).toFixed(1)} KB
            </div>
          </div>

          <div className={docPreviewActions}>
            {/* Thumbnail toggle */}
            <button onClick={() => setShowThumbnails((x) => !x)} className={docPreviewActionButton}>
              {showThumbnails ? `Hide Thumbs` : `Show Thumbs`}
            </button>

            {/* Zoom controls */}
            {isPDF || isImage ? (
              <div className={flexRowItemsCenter}>
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - ZOOM_STEP))}
                  className={docPreviewActionButtonSquare}
                >
                  –
                </button>
                <span className={docPreviewZoomLabel}>{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + ZOOM_STEP))}
                  className={docPreviewActionButtonSquare}
                >
                  +
                </button>
              </div>
            ) : null}

            {/* Fit to width */}
            <button onClick={() => setZoom(1)} className={docPreviewActionButton}>
              Fit
            </button>

            {/* Download */}
            <a href={doc.downloadUrl} download={doc.name} className={docPreviewActionButton}>
              Download
            </a>

            {/* Print */}
            <button
              onClick={() => window.open(doc.downloadUrl, `_blank`)?.print?.()}
              className={docPreviewActionButton}
            >
              Print
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className={docPreviewActionButton}>
              {isFullscreen ? `Exit Fullscreen` : `Fullscreen`}
            </button>

            {/* Close */}
            <button onClick={onClose} className={docPreviewCloseButton}>
              ×
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className={docPreviewContent}>
          {/* Sidebar thumbnails */}
          {showThumbnails && isPDF && (
            <div className={docPreviewSidebar}>
              {/* Placeholder for real thumbnails, can integrate PDF.js */}
              <div className={docPreviewSidebarLabel}>Thumbnails</div>
            </div>
          )}

          {/* Document */}
          <div className={docPreviewDocument}>
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
          </div>
        </div>

        {/* Drag handle */}
        {!isFullscreen && (
          <div onMouseDown={startDragging} className={docPreviewDragHandle}>
            <div className={docPreviewDragHandleIcon} />
          </div>
        )}
      </div>
    </div>
  );
}
