'use client';

import { useEffect } from 'react';

import { Button } from './Button';
import { CheckIcon } from './icons/CheckIcon';
import styles from './SuccessModal.module.css';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * SuccessModal - Success confirmation modal for completed operations
 */
export function SuccessModal({ isOpen, onClose, title, message, actionLabel, actionHref }: SuccessModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <div className={styles.panel}>
        <div className={styles.content}>
          <div className={styles.iconWrap}>
            <CheckIcon className={styles.icon} />
          </div>

          <h2 id="success-modal-title" className={styles.title}>
            {title}
          </h2>

          <p className={styles.message}>{message}</p>

          <div className={styles.actions}>
            {actionHref && actionLabel ? (
              <a href={actionHref}>
                <Button variant="primary" size="md" className={styles.actionFullWidth}>
                  {actionLabel}
                </Button>
              </a>
            ) : null}
            <Button variant="outline" size="md" onClick={onClose} className={styles.actionFullWidth}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
