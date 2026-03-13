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

function getField(item: PaymentMethodItem, key: string): unknown {
  if (item == null || typeof item !== `object`) return undefined;
  return key in item ? item[key] : undefined;
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
            const id = getField(item, `id`) as string | undefined;
            const brand = getField(item, `brand`) as string | undefined;
            const last4 = getField(item, `last4`) as string | undefined;
            const type = getField(item, `type`) as string | undefined;
            const expMonth = getField(item, `expMonth`) as number | undefined;
            const expYear = getField(item, `expYear`) as number | undefined;
            const defaultSelected = getField(item, `defaultSelected`) as boolean | undefined;
            const billingDetails = getField(item, `billingDetails`) as { name?: string } | undefined;

            const key = id ?? String(Math.random());
            const isLoadingThis = isSettingDefault === id;

            return (
              <div key={key} className={styles.card}>
                {defaultSelected ? <div className={styles.defaultBadge}>Default</div> : null}

                <div className={styles.cardTop}>
                  <div className={styles.cardIconWrap}>
                    {type === `BANK_ACCOUNT` ? (
                      <BankIcon className={styles.cardIcon} strokeWidth={2} />
                    ) : (
                      <CreditCardIcon className={styles.cardIcon} />
                    )}
                  </div>
                  <div className={styles.cardMain}>
                    <div className={styles.cardType}>{type === `BANK_ACCOUNT` ? `Bank account` : brand}</div>
                    <div className={styles.cardNumber}>•••• {last4 ?? `****`}</div>
                    {expMonth && expYear ? (
                      <div className={styles.cardExp}>
                        <CalendarIcon className={styles.cardExpIcon} />
                        <span>
                          Expires {String(expMonth).padStart(2, `0`)}/{expYear}
                        </span>
                      </div>
                    ) : null}
                    {billingDetails?.name ? (
                      <div className={styles.cardBilling} title={billingDetails.name}>
                        <UserIcon className={styles.cardBillingIcon} />
                        <span className={styles.cardBillingName}>{billingDetails.name}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  {!defaultSelected && id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(id)}
                      isLoading={isLoadingThis}
                      disabled={isLoadingThis}
                      className={styles.setDefaultBtn}
                    >
                      <CheckIcon className={styles.setDefaultIcon} strokeWidth={2.5} />
                      Set default
                    </Button>
                  ) : null}
                  {id ? (
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
                  ) : null}
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
          if (selectedMethod) {
            const id = getField(selectedMethod, `id`) as string | undefined;
            if (id) handleDelete(id);
          }
        }}
        title="Delete payment method"
        message={
          selectedMethod
            ? `Are you sure you want to delete this payment method (${getField(selectedMethod, `brand`) as string} •••• ${getField(selectedMethod, `last4`) as string})? This action cannot be undone.`
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
