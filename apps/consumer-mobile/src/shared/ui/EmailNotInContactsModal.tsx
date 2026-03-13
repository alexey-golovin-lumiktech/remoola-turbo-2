'use client';

import { Button } from './Button';
import styles from './EmailNotInContactsModal.module.css';
import { Modal } from './Modal';

interface EmailNotInContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onAddAndContinue: () => void;
  onContinueWithout: () => void;
  /** Copy variant: message differs for payment vs payment request */
  variant?: `payment` | `paymentRequest`;
}

const messageSuffix: Record<NonNullable<EmailNotInContactsModalProps[`variant`]>, string> = {
  payment: `Would you like to add it before sending the payment?`,
  paymentRequest: `Would you like to add it before creating the payment request?`,
};

/**
 * EmailNotInContactsModal - Shown when user enters an email that isn't in contacts.
 * Offers: add contact and continue, continue without adding, or cancel.
 */
export function EmailNotInContactsModal({
  isOpen,
  onClose,
  email,
  onAddAndContinue,
  onContinueWithout,
  variant = `payment`,
}: EmailNotInContactsModalProps) {
  const suffix = messageSuffix[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email not in contacts" size="sm">
      <div className={styles.content}>
        <p className={styles.message}>
          The email <strong className={styles.emailStrong}>{email}</strong> isn&apos;t in your contacts.
          {` `}
          {suffix}
        </p>

        <div className={styles.actions}>
          <Button variant="primary" size="md" onClick={onAddAndContinue} className={styles.buttonFull}>
            Add contact and continue
          </Button>
          <Button variant="outline" size="md" onClick={onContinueWithout} className={styles.buttonFull}>
            Continue without adding
          </Button>
          <Button variant="ghost" size="md" onClick={onClose} className={styles.buttonFull}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
