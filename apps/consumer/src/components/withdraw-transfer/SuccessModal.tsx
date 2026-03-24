'use client';

import { type ReactNode } from 'react';

import localStyles from './SuccessModal.module.css';
import styles from '../ui/classNames.module.css';

const { successModalContent, successModalDescription, successModalOverlay, successModalTitle } = styles;

type SuccessModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onCloseAction: () => void;
  actions?: ReactNode;
};

export function SuccessModal({ open, title, description, onCloseAction, actions }: SuccessModalProps) {
  if (!open) return null;

  return (
    <div className={successModalOverlay}>
      <div className={successModalContent}>
        <h3 className={successModalTitle}>{title}</h3>
        {description && <p className={successModalDescription}>{description}</p>}

        <div className={localStyles.actionsRow}>
          {actions}
          <button type="button" onClick={onCloseAction} className={localStyles.okButton}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
