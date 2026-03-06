'use client';

import { type ReactNode } from 'react';

import { Button } from '../../../shared/ui/Button';

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
      aria-labelledby="confirmation-title"
    >
      <div
        className={`
          fixed
          inset-0
          bg-slate-900/60
          backdrop-blur-md
          transition-opacity
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`
          relative
          z-10
          w-full
          max-w-md
          overflow-hidden
          rounded-t-3xl
          bg-white
          shadow-2xl
          sm:rounded-3xl
          dark:bg-slate-800
        `}
      >
        <div
          className={`
            px-6
            py-5
          `}
        >
          {icon && (
            <div
              className={`
                flex
                justify-center
                mb-5
              `}
            >
              {icon}
            </div>
          )}
          <h2
            id="confirmation-title"
            className={`
              text-xl
              font-bold
              text-slate-900
              dark:text-white
              text-center
            `}
          >
            {title}
          </h2>
          <p
            className={`
              mt-3
              text-sm
              text-slate-600
              dark:text-slate-400
              text-center
            `}
          >
            {message}
          </p>
        </div>

        <div
          className={`
            flex
            gap-3
            border-t
            bg-gradient-to-r
            from-slate-50
            via-white
            to-slate-50
            px-6
            py-4
            dark:border-slate-700
            dark:from-slate-800/50
            dark:via-slate-900/50
            dark:to-slate-800/50
            backdrop-blur-sm
          `}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className={`
              flex-1
            `}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className={`
              flex-1
            `}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
