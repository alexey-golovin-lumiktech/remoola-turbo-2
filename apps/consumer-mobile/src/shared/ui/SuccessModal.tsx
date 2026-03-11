'use client';

import { useEffect } from 'react';

import { Button } from './Button';
import { CheckIcon } from './icons/CheckIcon';

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
    <div
      className={`
        fixed
        inset-0
        z-50
        flex
        items-end
        justify-center
        sm:items-center
        sm:p-4
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <div
        className={`
          fixed
          inset-0
          bg-black/20
          backdrop-blur-xs
          transition-opacity
          dark:bg-slate-900/50
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`
        relative
        z-10
        w-full
        max-w-sm
        overflow-hidden
        rounded-t-2xl
        bg-white
        shadow-xl
        sm:rounded-2xl
        dark:bg-slate-800
      `}
      >
        <div className={`px-6 py-8 text-center`}>
          <div
            className={`
            mx-auto
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-green-100
            dark:bg-green-900/30
          `}
          >
            <CheckIcon
              className={`
              h-8
              w-8
              text-green-600
              dark:text-green-400
            `}
            />
          </div>

          <h2
            id="success-modal-title"
            className={`
            mt-4
            text-xl
            font-semibold
            text-slate-900
            dark:text-white
          `}
          >
            {title}
          </h2>

          <p
            className={`
            mt-2
            text-sm
            text-slate-600
            dark:text-slate-400
          `}
          >
            {message}
          </p>

          <div
            className={`
            mt-6
            flex
            flex-col
            gap-3
          `}
          >
            {actionHref && actionLabel && (
              <a href={actionHref}>
                <Button variant="primary" size="md" className={`w-full`}>
                  {actionLabel}
                </Button>
              </a>
            )}
            <Button variant="outline" size="md" onClick={onClose} className={`w-full`}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
