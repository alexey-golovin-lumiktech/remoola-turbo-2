'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { attachDocumentToPayment } from '../actions';

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
        showErrorToast(err instanceof Error ? err.message : `Failed to load payments`);
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
      showErrorToast(result.error.message, { code: result.error.code });
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
        <div
          className={`
            flex
            gap-3
          `}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className={`
              flex-1
            `}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAttach}
            isLoading={isPending}
            disabled={isPending || !selectedPaymentId}
            className={`
              flex-1
            `}
          >
            Attach
          </Button>
        </div>
      }
    >
      <div
        className={`
          space-y-4
        `}
      >
        {isLoading ? (
          <div
            className={`
              space-y-3
            `}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`
                  h-20
                  animate-pulse
                  rounded-lg
                  bg-slate-200
                  dark:bg-slate-700
                `}
              />
            ))}
          </div>
        ) : fetchError ? (
          <div
            className={`
              py-8
              text-center
            `}
          >
            <p
              className={`
                text-sm
                text-slate-500
                dark:text-slate-400
              `}
            >
              Failed to load payments. Please try again.
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div
            className={`
              py-8
              text-center
            `}
          >
            <p
              className={`
                text-sm
                text-slate-500
                dark:text-slate-400
              `}
            >
              No payments available
            </p>
          </div>
        ) : (
          <div
            className={`
              max-h-[60vh]
              space-y-2
              overflow-y-auto
            `}
          >
            {payments.map((payment) => {
              const isSelected = selectedPaymentId === payment.id;
              return (
                <button
                  key={payment.id}
                  onClick={() => setSelectedPaymentId(payment.id)}
                  className={`
                    w-full
                    min-h-[44px]
                    rounded-lg
                    border
                    p-4
                    text-left
                    transition-all
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary-500
                    ${
                      isSelected
                        ? `border-primary-500 bg-primary-50 dark:border-primary-600 dark:bg-primary-950`
                        : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700`
                    }
                  `}
                >
                  <div
                    className={`
                      flex
                      items-start
                      justify-between
                      gap-3
                    `}
                  >
                    <div
                      className={`
                        flex-1
                        min-w-0
                      `}
                    >
                      <p
                        className={`
                          truncate
                          font-semibold
                          ${isSelected ? `text-primary-900 dark:text-primary-100` : `text-slate-900 dark:text-white`}
                        `}
                      >
                        {payment.description || `Payment`}
                      </p>
                      <p
                        className={`
                          mt-0.5
                          truncate
                          text-sm
                          ${isSelected ? `text-primary-700 dark:text-primary-300` : `text-slate-600 dark:text-slate-400`}
                        `}
                      >
                        {payment.counterparty.email}
                      </p>
                      <p
                        className={`
                          mt-1
                          text-xs
                          ${isSelected ? `text-primary-600 dark:text-primary-400` : `text-slate-500 dark:text-slate-500`}
                        `}
                      >
                        {new Date(payment.createdAt).toLocaleDateString(undefined, {
                          year: `numeric`,
                          month: `short`,
                          day: `numeric`,
                        })}
                      </p>
                    </div>
                    <div
                      className={`
                        shrink-0
                        text-right
                      `}
                    >
                      <p
                        className={`
                          font-semibold
                          ${isSelected ? `text-primary-900 dark:text-primary-100` : `text-slate-900 dark:text-white`}
                        `}
                      >
                        {formatAmount(payment.amount, payment.currencyCode)}
                      </p>
                    </div>
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
