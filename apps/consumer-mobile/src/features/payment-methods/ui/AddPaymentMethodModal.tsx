'use client';

import { PaymentMethodForm } from './PaymentMethodForm';
import { StripeProvider } from '../../../shared/providers/StripeProvider';
import { Modal } from '../../../shared/ui/Modal';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddPaymentMethodModal({ isOpen, onClose, onSuccess }: AddPaymentMethodModalProps) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add method" size="lg">
      <StripeProvider>
        <PaymentMethodForm onSuccess={handleSuccess} onCancel={onClose} />
      </StripeProvider>
    </Modal>
  );
}
