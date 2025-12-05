'use client';

import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onCloseAction: () => void;
  actions?: ReactNode;
};

export function SuccessModal({ open, title, description, onCloseAction, actions }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[90%] max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        {description && <p className="mb-4 text-sm text-gray-600">{description}</p>}

        <div className="flex gap-3">
          {actions}
          <button
            type="button"
            onClick={onCloseAction}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
