'use client';

import { useState } from 'react';

import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { Modal } from '../../../shared/ui/Modal';
import { type Contact } from '../schemas';

interface DeleteContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onSubmit: () => Promise<void>;
}

export function DeleteContactModal({ isOpen, onClose, contact, onSubmit }: DeleteContactModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!contact) return;

    setIsLoading(true);

    try {
      await onSubmit();
      showSuccessToast(`Contact deleted successfully`);
      onClose();
    } catch (err) {
      clientLogger.error(`Failed to delete contact`, {
        contactId: contact.id,
        error: err,
      });
      showErrorToast(err instanceof Error ? err.message : `Failed to delete contact. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!contact) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete contact" size="sm">
      <div className={`space-y-5`}>
        <div
          className={`
          rounded-xl
          bg-red-50
          border
          border-red-100
          p-5
          dark:bg-red-900/20
          dark:border-red-800
        `}
        >
          <div className={`flex gap-4`}>
            <div
              className={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-red-600
              dark:bg-red-500
              shadow-lg
              shadow-red-600/30
            `}
            >
              <AlertTriangleIcon className={`h-6 w-6 text-white`} />
            </div>
            <div className={`flex-1`}>
              <p
                className={`
                text-base
                font-bold
                text-red-900
                dark:text-red-200
              `}
              >
                Are you sure you want to delete this contact?
              </p>
              <p
                className={`
                mt-2
                text-sm
                text-red-800
                dark:text-red-300
              `}
              >
                <span className={`font-semibold`}>{contact.name ?? contact.email}</span>
              </p>
              <p
                className={`
                mt-1
                text-xs
                text-red-700
                dark:text-red-400
              `}
              >
                This action cannot be undone and will permanently remove this contact from your network.
              </p>
            </div>
          </div>
        </div>

        <div
          className={`
          flex
          flex-col
          gap-3
          sm:flex-row
        `}
        >
          <Button type="button" variant="outline" size="md" onClick={onClose} className={`min-h-11 flex-1`}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            isLoading={isLoading}
            onClick={handleDelete}
            className={`
              min-h-11
              flex-1
              shadow-lg
              shadow-red-500/30
              hover:shadow-xl
              hover:shadow-red-500/40
            `}
          >
            Delete contact
          </Button>
        </div>
      </div>
    </Modal>
  );
}
