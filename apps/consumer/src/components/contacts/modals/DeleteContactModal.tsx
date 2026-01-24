'use client';

import { type ConsumerContact } from '../../../types';
import {
  modalButtonDanger,
  modalButtonSecondary,
  modalContentMd,
  modalFooterActions,
  modalOverlayClass,
  modalParagraphClass,
  modalTitleClass,
  mt4,
  py2,
} from '../../ui/classNames';

type DeleteContactModalProps = {
  open: boolean;
  onCloseAction: () => void;
  contact: ConsumerContact | null;
  onDeletedAction: () => void;
};

export function DeleteContactModal({ open, onCloseAction, contact, onDeletedAction }: DeleteContactModalProps) {
  if (!open || !contact) return null;

  async function remove() {
    const res = await fetch(`/api/contacts/${contact!.id}`, {
      method: `DELETE`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });
    if (res.ok) {
      onDeletedAction();
      onCloseAction();
    }
    const parsed = JSON.parse((await res.text()) || `{}`);
    alert(`An unexpected error occurred: ${parsed?.message || res.statusText}`);
  }

  return (
    <div className={modalOverlayClass}>
      <div className={modalContentMd}>
        <h2 className={modalTitleClass}>Delete Contact</h2>
        <p className={`${modalParagraphClass} ${py2}`}>
          Are you sure you want to delete &quot;{contact.name ?? contact.email}&quot;?
        </p>

        <div className={`${modalFooterActions} ${mt4}`}>
          <button onClick={onCloseAction} className={modalButtonSecondary}>
            Cancel
          </button>
          <button onClick={remove} className={modalButtonDanger}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
