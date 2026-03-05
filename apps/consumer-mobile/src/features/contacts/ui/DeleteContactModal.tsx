'use client';

import { useState } from 'react';

import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';

import type { Contact } from '../schemas';

interface DeleteContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onSubmit: () => Promise<void>;
}

export function DeleteContactModal({ isOpen, onClose, contact, onSubmit }: DeleteContactModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!contact) return;

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete contact. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!contact) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete contact" size="sm">
      <div className="space-y-4">
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Are you sure you want to delete this contact?
              </p>
              <p className="mt-1 text-xs text-red-800 dark:text-red-300">
                <span className="font-semibold">{contact.name ?? contact.email}</span>
                <br />
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            isLoading={isLoading}
            onClick={handleDelete}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
