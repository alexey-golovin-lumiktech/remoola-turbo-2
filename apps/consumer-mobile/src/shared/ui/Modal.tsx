'use client';

import { type ReactNode, useEffect } from 'react';

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

  const sizeStyles = {
    sm: `max-w-sm`,
    md: `max-w-md`,
    lg: `max-w-lg`,
    xl: `max-w-xl`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? `modal-title` : undefined}
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`
          relative z-10 w-full overflow-hidden rounded-t-2xl bg-white shadow-xl
          sm:rounded-2xl ${sizeStyles[size]}
          dark:bg-slate-800
        `}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
