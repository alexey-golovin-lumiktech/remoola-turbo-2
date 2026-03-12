'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setDefaultPaymentMethodAction, deletePaymentMethodAction } from './actions';
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
        <div className={`space-y-6`} data-testid="consumer-mobile-payment-methods">
          <div
            className={`
  flex
  flex-col
  items-stretch
  gap-3
  sm:flex-row
  sm:items-center
  sm:justify-between
            `}
          >
            <div>
              <h1
                className={`
  text-2xl
  font-bold
  text-slate-900
  dark:text-white
                `}
              >
                Payment methods
              </h1>
              <p
                className={`
  mt-1
  text-sm
  text-slate-600
  dark:text-slate-400
                `}
              >
                Add cards or bank accounts for quick payments
              </p>
            </div>
          </div>
          <EmptyState
            icon={<CreditCardIcon className={`h-10 w-10`} strokeWidth={1.5} />}
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
      <div className={`space-y-6`} data-testid="consumer-mobile-payment-methods">
        <div
          className={`
  flex
  flex-col
  items-stretch
  gap-3
  sm:flex-row
  sm:items-center
  sm:justify-between
          `}
        >
          <div>
            <h1
              className={`
  text-2xl
  font-bold
  text-slate-900
  dark:text-white
              `}
            >
              Payment methods
            </h1>
            <p
              className={`
  mt-1
  text-sm
  text-slate-600
  dark:text-slate-400
              `}
            >
              Manage your cards and bank accounts
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setAddModalOpen(true)}
            className={`min-h-11 w-full sm:w-auto`}
          >
            <PlusIcon className={`h-5 w-5`} strokeWidth={2.5} />
            <span className={`ml-2 font-semibold`}>Add method</span>
          </Button>
        </div>

        <div
          className={`
  grid
  gap-3
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
          `}
        >
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
              <div
                key={key}
                className={`
  group
  relative
  overflow-hidden
  rounded-2xl
  border
  border-slate-200
  bg-white
  p-4
  shadow-xs
  transition-all
  duration-200
  hover:border-primary-300
  hover:shadow-md
  active:scale-[0.98]
  dark:border-slate-700
  dark:bg-slate-800
  dark:hover:border-primary-600
  sm:p-5
                `}
              >
                {defaultSelected && (
                  <div
                    className={`
  absolute
  right-0
  top-0
  rounded-bl-xl
  bg-linear-to-br
  from-primary-500
  to-primary-600
  px-3
  py-1.5
  text-xs
  font-semibold
  text-white
  shadow-xs
                    `}
                  >
                    Default
                  </div>
                )}

                <div
                  className={`
  mb-4
  flex
  items-start
  gap-3
                  `}
                >
                  <div
                    className={`
  flex
  h-14
  w-14
  shrink-0
  items-center
  justify-center
  rounded-xl
  bg-linear-to-br
  from-primary-500
  to-primary-600
  text-white
  shadow-xs
  transition-transform
  duration-200
  group-hover:scale-105
                    `}
                  >
                    {type === `BANK_ACCOUNT` ? (
                      <BankIcon className={`h-7 w-7`} strokeWidth={2} />
                    ) : (
                      <CreditCardIcon className={`h-7 w-7`} />
                    )}
                  </div>
                  <div className={`flex-1 min-w-0`}>
                    <div
                      className={`
  mb-0.5
  text-xs
  font-medium
  uppercase
  tracking-wide
  text-slate-500
  dark:text-slate-400
                      `}
                    >
                      {type === `BANK_ACCOUNT` ? `Bank account` : brand}
                    </div>
                    <div
                      className={`
  text-lg
  font-bold
  tracking-tight
  text-slate-900
  dark:text-white
  sm:text-xl
                      `}
                    >
                      •••• {last4 ?? `****`}
                    </div>
                    {expMonth && expYear && (
                      <div
                        className={`
  mt-1.5
  flex
  items-center
  gap-1
  text-xs
  text-slate-600
  dark:text-slate-400
                      `}
                      >
                        <CalendarIcon className={`h-3.5 w-3.5`} />
                        <span>
                          Expires {String(expMonth).padStart(2, `0`)}/{expYear}
                        </span>
                      </div>
                    )}
                    {billingDetails?.name && (
                      <div
                        className={`
  mt-1.5
  flex
  items-center
  gap-1
  truncate
  text-xs
  text-slate-600
  dark:text-slate-400
                        `}
                        title={billingDetails.name}
                      >
                        <UserIcon className={`h-3.5 w-3.5 shrink-0`} />
                        <span className={`truncate`}>{billingDetails.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex gap-2`}>
                  {!defaultSelected && id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(id)}
                      isLoading={isLoadingThis}
                      disabled={isLoadingThis}
                      className={`
  min-h-10
  flex-1
  text-xs
  font-medium
                      `}
                    >
                      <CheckIcon className={`mr-1.5 h-3.5 w-3.5`} strokeWidth={2.5} />
                      Set default
                    </Button>
                  )}
                  {id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMethod(item);
                        setDeleteModalOpen(true);
                      }}
                      className={`
  min-h-10
  flex-1
  text-xs
  font-medium
  text-red-600
  hover:border-red-300
  hover:bg-red-50
  dark:text-red-400
  dark:hover:border-red-700
  dark:hover:bg-red-900/20
                      `}
                    >
                      <TrashIcon className={`mr-1.5 h-3.5 w-3.5`} strokeWidth={2.5} />
                      Delete
                    </Button>
                  )}
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
