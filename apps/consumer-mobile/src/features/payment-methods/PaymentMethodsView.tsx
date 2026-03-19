'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setDefaultPaymentMethodAction, deletePaymentMethodAction } from './actions';
import styles from './PaymentMethodsView.module.css';
import { type PaymentMethodItem } from './queries';
import { AddPaymentMethodModal } from './ui/AddPaymentMethodModal';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import { clientLogger } from '../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../lib/toast.client';
import { Button } from '../../shared/ui/Button';
import { ConfirmationModal } from '../../shared/ui/ConfirmationModal';
import { EmptyState } from '../../shared/ui/EmptyState';
import { BankIcon } from '../../shared/ui/icons/BankIcon';
import { CalendarIcon } from '../../shared/ui/icons/CalendarIcon';
import { CheckIcon } from '../../shared/ui/icons/CheckIcon';
import { CreditCardIcon } from '../../shared/ui/icons/CreditCardIcon';
import { PlusIcon } from '../../shared/ui/icons/PlusIcon';
import { TrashIcon } from '../../shared/ui/icons/TrashIcon';
import { UserIcon } from '../../shared/ui/icons/UserIcon';

interface PaymentMethodsViewProps {
  items: PaymentMethodItem[];
}

export function PaymentMethodsView({ items }: PaymentMethodsViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);

  async function handleSetDefault(methodId: string) {
    setIsSettingDefault(methodId);
    try {
      const result = await setDefaultPaymentMethodAction(methodId);
      if (!result.ok) {
        clientLogger.error(`Failed to set default payment method`, {
          methodId,
          error: result.error,
        });
        showErrorToast(
          getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)),
          { code: result.error.code },
        );
        return;
      }
      showSuccessToast(`Default payment method updated`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      clientLogger.error(`Failed to set default payment method`, {
        methodId,
        error: err,
      });
      showErrorToast(getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR));
    } finally {
      setIsSettingDefault(null);
    }
  }

  async function handleDelete(methodId: string) {
    setIsDeleting(true);
    try {
      const result = await deletePaymentMethodAction(methodId);
      if (!result.ok) {
        clientLogger.error(`Failed to delete payment method`, {
          methodId,
          error: result.error,
        });
        showErrorToast(
          getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.PAYMENT_METHOD_DELETE_FAILED)),
          { code: result.error.code },
        );
        return;
      }
      showSuccessToast(`Payment method removed`);
      setDeleteModalOpen(false);
      setSelectedMethod(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      clientLogger.error(`Failed to delete payment method`, {
        methodId,
        error: err,
      });
      showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_METHOD_DELETE_FAILED));
    } finally {
      setIsDeleting(false);
    }
  }

  if (items.length === 0) {
    return (
      <>
        <div className={styles.wrap} data-testid="consumer-mobile-payment-methods">
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Payment methods</h1>
              <p className={styles.subtitle}>Add cards or bank accounts for quick payments</p>
            </div>
          </div>
          <EmptyState
            icon={<CreditCardIcon className={styles.emptyIcon} strokeWidth={1.5} />}
            title="No payment methods yet"
            description="Add your first payment method to start making and receiving payments quickly and securely."
            action={{
              label: `Add method`,
              onClick: () => setAddModalOpen(true),
            }}
          />
        </div>

        <AddPaymentMethodModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className={styles.wrap} data-testid="consumer-mobile-payment-methods">
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Payment methods</h1>
            <p className={styles.subtitle}>Manage your cards and bank accounts</p>
          </div>
          <Button variant="primary" size="md" onClick={() => setAddModalOpen(true)} className={styles.addBtn}>
            <PlusIcon className={styles.addBtnIcon} strokeWidth={2.5} />
            <span className={styles.addBtnLabel}>Add method</span>
          </Button>
        </div>

        <div className={styles.grid}>
          {items.map((item) => {
            const isLoadingThis = isSettingDefault === item.id;

            return (
              <div key={item.id} className={styles.card}>
                {item.defaultSelected ? <div className={styles.defaultBadge}>Default</div> : null}

                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap}>
                    {item.type === `BANK_ACCOUNT` ? (
                      <BankIcon className={styles.cardIcon} strokeWidth={2} />
                    ) : (
                      <CreditCardIcon className={styles.cardIcon} />
                    )}
                  </div>
                  <div className={styles.cardMain}>
                    <div className={styles.cardType}>{item.type === `BANK_ACCOUNT` ? `Bank account` : item.brand}</div>
                    <div className={styles.cardNumber}>•••• {item.last4}</div>
                    {item.expMonth && item.expYear ? (
                      <div className={styles.cardExp}>
                        <CalendarIcon className={styles.cardExpIcon} />
                        <span>
                          Expires {item.expMonth}/{item.expYear}
                        </span>
                      </div>
                    ) : null}
                    {item.billingDetails?.name ? (
                      <div className={styles.cardBilling} title={item.billingDetails.name}>
                        <UserIcon className={styles.cardBillingIcon} />
                        <span className={styles.cardBillingName}>{item.billingDetails.name}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  {!item.defaultSelected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(item.id)}
                      isLoading={isLoadingThis}
                      disabled={isLoadingThis}
                      className={styles.setDefaultBtn}
                    >
                      <CheckIcon className={styles.setDefaultIcon} strokeWidth={2.5} />
                      Set default
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMethod(item);
                      setDeleteModalOpen(true);
                    }}
                    className={styles.deleteBtn}
                  >
                    <TrashIcon className={styles.deleteIcon} strokeWidth={2.5} />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
          }
        }}
        onConfirm={() => {
          if (selectedMethod) handleDelete(selectedMethod.id);
        }}
        title="Delete payment method"
        message={
          selectedMethod
            ? `Are you sure you want to delete this payment method (${selectedMethod.brand} •••• ${selectedMethod.last4})? This action cannot be undone.`
            : `Are you sure you want to delete this payment method? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <AddPaymentMethodModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </>
  );
}
