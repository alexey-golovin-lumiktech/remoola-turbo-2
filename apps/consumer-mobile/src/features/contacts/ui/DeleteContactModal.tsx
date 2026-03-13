'use client';

import { useState } from 'react';

import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { type Contact } from '../schemas';
import styles from './DeleteContactModal.module.css';

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
      showErrorToast(getLocalToastMessage(localToastKeys.CONTACT_UNEXPECTED_ERROR));
    } finally {
      setIsLoading(false);
    }
  };

  if (!contact) return null;

  const displayName = contact.name ?? contact.email;
  const message = `Are you sure you want to delete ${displayName}? This action cannot be undone and will permanently remove this contact from your network.`;

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete contact"
      message={message}
      confirmText="Delete contact"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
      icon={
        <div className={styles.iconWrap}>
          <AlertTriangleIcon className={styles.icon} />
        </div>
      }
    />
  );
}
