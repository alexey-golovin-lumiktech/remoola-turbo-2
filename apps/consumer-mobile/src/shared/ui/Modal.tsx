'use client';

import { type ReactNode, useEffect } from 'react';

import { XIcon } from './icons/XIcon';

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
      className={`
        fixed
        inset-0
        z-50
        flex
        items-end
        justify-center
        sm:items-center
        sm:p-4
        animate-in
        fade-in
        duration-200
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? `modal-title` : undefined}
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
          relative z-10 w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl
          sm:rounded-3xl ${sizeStyles[size]}
          dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200
        `}
      >
        {title && (
          <div
            className={`
            flex
            items-center
            justify-between
            border-b
            border-slate-200
            px-6
            py-5
            dark:border-slate-700
          `}
          >
            <h2
              id="modal-title"
              className={`
              text-xl
              font-bold
              text-slate-900
              dark:text-white
            `}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className={`
                rounded-xl
                p-2
                text-slate-400
                transition-all
                hover:bg-slate-100
                hover:text-slate-600
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                focus:ring-offset-2
                active:scale-95
                dark:hover:bg-slate-700
                dark:hover:text-slate-300
              `}
              aria-label="Close modal"
            >
              <XIcon className={`h-6 w-6`} strokeWidth={2} />
            </button>
          </div>
        )}

        <div
          className={`
          max-h-[70vh]
          overflow-y-auto
          px-6
          py-5
        `}
        >
          {children}
        </div>

        {footer && (
          <div
            className={`
            border-t
            border-slate-200
            bg-slate-50/50
            px-6
            py-4
            dark:border-slate-700
            dark:bg-slate-800/50
            backdrop-blur-xs
          `}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
