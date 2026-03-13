'use client';

import { type ReactNode, useEffect } from 'react';

import { cn } from '@remoola/ui';

import { XIcon } from './icons/XIcon';
import styles from './Modal.module.css';

const panelSizeClass = {
  sm: styles.panelSm,
  md: styles.panelMd,
  lg: styles.panelLg,
  xl: styles.panelXl,
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: `sm` | `md` | `lg` | `xl`;
}

/**
 * Modal - Accessible modal dialog component
 * Follows mobile-first design with proper focus management and accessibility
 */
export function Modal({ isOpen, onClose, title, children, footer, size = `md` }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = `hidden`;
    } else {
      document.body.style.overflow = ``;
    }

    return () => {
      document.body.style.overflow = ``;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === `Escape` && isOpen) {
        onClose();
      }
    };

    document.addEventListener(`keydown`, handleEscape);
    return () => document.removeEventListener(`keydown`, handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(styles.overlay, `animate-in fade-in duration-200`)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? `modal-title` : undefined}
    >
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <div
        className={cn(
          styles.panel,
          panelSizeClass[size],
          `animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`,
        )}
      >
        {title ? (
          <div className={styles.header}>
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
            <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close modal">
              <XIcon className={styles.closeIcon} strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <div className={styles.body}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
