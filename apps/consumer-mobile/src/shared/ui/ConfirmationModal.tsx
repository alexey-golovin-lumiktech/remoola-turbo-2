'use client';

import { type ReactNode } from 'react';

import { Button } from './Button';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: `danger` | `primary`;
  isLoading?: boolean;
  icon?: ReactNode;
}

/**
 * ConfirmationModal - Mobile-first confirmation dialog
 * Bottom sheet on mobile, centered modal on desktop
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = `Confirm`,
  cancelText = `Cancel`,
  variant = `primary`,
  isLoading = false,
  icon,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <div className={styles.panel}>
        <div className={styles.content}>
          {icon ? <div className={styles.iconWrap}>{icon}</div> : null}
          <h2 id="confirmation-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose} disabled={isLoading} className={styles.footerButton}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className={styles.footerButton}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
