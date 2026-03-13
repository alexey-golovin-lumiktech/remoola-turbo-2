'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { attachDocumentToPayment } from '../actions';
import styles from './PaymentPickerModal.module.css';

interface PaymentPickerModalProps {
  documentId: string;
  onClose: () => void;
}

interface PaymentSummary {
  id: string;
  description?: string | null;
  amount: number;
  currencyCode: string;
  counterparty: {
    email: string;
  };
  createdAt: string;
}

/**
 * PaymentPickerModal - Mobile-friendly payment selection for document attachment
 * Fetches available payments and allows selection
 */
export function PaymentPickerModal({ documentId, onClose }: PaymentPickerModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch(`/api/payments?pageSize=20`);
        if (!res.ok) {
          throw new Error(`Failed to fetch payments`);
        }
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items ?? []);
        setPayments(items);
      } catch (err) {
        clientLogger.error(`Failed to fetch payments for document attachment`, {
          documentId,
          error: err,
        });
        setFetchError(true);
        showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_NOT_FOUND));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [documentId]);

  const handleAttach = async () => {
    if (!selectedPaymentId) return;

    const result = await attachDocumentToPayment({
      documentId,
      paymentRequestId: selectedPaymentId,
    });

    if (result.ok) {
      showSuccessToast(`Document attached to payment`);
      startTransition(() => {
        router.refresh();
      });
      onClose();
    } else {
      clientLogger.error(`Failed to attach document to payment`, {
        documentId,
        paymentRequestId: selectedPaymentId,
        error: result.error,
      });
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.DOCUMENTS_ATTACH_FAILED)),
        { code: result.error.code },
      );
    }
  };

  const formatAmount = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat(undefined, {
      style: `currency`,
      currency: currencyCode,
    }).format(amount / 100);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Attach to Payment"
      size="md"
      footer={
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose} disabled={isPending} className={styles.footerBtn}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAttach}
            isLoading={isPending}
            disabled={isPending || !selectedPaymentId}
            className={styles.footerBtn}
          >
            Attach
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : fetchError ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>Failed to load payments. Please try again.</p>
          </div>
        ) : payments.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No payments available</p>
          </div>
        ) : (
          <div className={styles.list}>
            {payments.map((payment) => {
              const isSelected = selectedPaymentId === payment.id;
              return (
                <button
                  key={payment.id}
                  onClick={() => setSelectedPaymentId(payment.id)}
                  className={`${styles.item} ${isSelected ? styles.itemSelected : styles.itemUnselected}`}
                >
                  <div className={styles.itemRow}>
                    <div className={styles.itemContent}>
                      <p className={styles.itemTitle}>{payment.description || `Payment`}</p>
                      <p className={styles.itemSub}>{payment.counterparty.email}</p>
                      <p className={styles.itemDate}>
                        {new Date(payment.createdAt).toLocaleDateString(undefined, {
                          year: `numeric`,
                          month: `short`,
                          day: `numeric`,
                        })}
                      </p>
                    </div>
                    <div className={styles.itemAmount}>{formatAmount(payment.amount, payment.currencyCode)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
