'use client';

import { useEffect, useState } from 'react';

import { cn } from '@remoola/ui';

import styles from './DocumentPreviewModal.module.css';
import { ArrowsPointingOutIcon } from '../../shared/ui/icons/ArrowsPointingOutIcon';
import { DocumentIcon } from '../../shared/ui/icons/DocumentIcon';
import { DownloadIcon } from '../../shared/ui/icons/DownloadIcon';
import { XIcon } from '../../shared/ui/icons/XIcon';

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
      className={cn(styles.overlay, isFullscreen ? styles.overlayFullscreen : styles.overlayNormal)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-preview-title"
    >
      {!isFullscreen ? <div className={styles.backdrop} onClick={onClose} aria-hidden="true" /> : null}

      <div className={cn(styles.panel, isFullscreen ? styles.panelFullscreen : styles.panelNormal)}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.titleWrap}>
              <h2 id="document-preview-title" className={styles.title}>
                {documentName}
              </h2>
            </div>

            {!isFullscreen ? (
              <button type="button" onClick={onClose} className={styles.closeBtnMobile} aria-label="Close preview">
                <XIcon className={styles.iconBtn} />
              </button>
            ) : null}
          </div>

          <div className={styles.headerRight}>
            <button type="button" onClick={handleDownload} className={styles.actionBtn} aria-label="Download document">
              <DownloadIcon className={styles.iconBtn} />
              <span className={styles.actionBtnLabel}>Download</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={styles.actionBtn}
              aria-label={isFullscreen ? `Exit fullscreen` : `Enter fullscreen`}
            >
              {isFullscreen ? (
                <>
                  <XIcon className={styles.iconBtn} />
                  <span className={styles.actionBtnLabel}>Exit</span>
                </>
              ) : (
                <>
                  <ArrowsPointingOutIcon className={styles.iconBtn} />
                  <span className={styles.actionBtnLabel}>Fullscreen</span>
                </>
              )}
            </button>

            {!isFullscreen ? (
              <button type="button" onClick={onClose} className={styles.closeBtnDesktop} aria-label="Close preview">
                <XIcon className={styles.iconBtn} />
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.body}>
          {isImage ? (
            <div className={styles.imageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={documentUrl} alt={documentName} className={styles.image} />
            </div>
          ) : isPdf ? (
            <iframe src={documentUrl} title={documentName} className={styles.iframe} frameBorder="0" />
          ) : (
            <div className={styles.fallbackWrap}>
              <div className={styles.fallbackIconWrap}>
                <DocumentIcon className={styles.fallbackIcon} />
              </div>
              <p className={styles.fallbackTitle}>Preview not available</p>
              <p className={styles.fallbackSub}>Download the file to view it</p>
              <button type="button" onClick={handleDownload} className={styles.fallbackBtn}>
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
