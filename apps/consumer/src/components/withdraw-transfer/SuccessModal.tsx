'use client';

import {
  flexRowGap3,
  mlAuto,
  modalButtonPrimary,
  successModalContent,
  successModalDescription,
  successModalOverlay,
  successModalTitle,
} from '../ui/classNames';

import type { ReactNode } from 'react';

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

        <div className={flexRowGap3}>
          {actions}
          <button type="button" onClick={onCloseAction} className={`${modalButtonPrimary} ${mlAuto}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
