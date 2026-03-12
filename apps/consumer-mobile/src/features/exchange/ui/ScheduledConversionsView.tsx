'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { XIcon } from '../../../shared/ui/icons/XIcon';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { cancelScheduledConversion } from '../actions';

interface ScheduledConversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

interface ScheduledConversionsViewProps {
  conversions: ScheduledConversion[];
}

export function ScheduledConversionsView({ conversions }: ScheduledConversionsViewProps) {
  const router = useRouter();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<ScheduledConversion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openCancelModal = (conversion: ScheduledConversion) => {
    setSelectedConversion(conversion);
    setIsCancelModalOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedConversion) return;

    setIsLoading(true);

    const result = await cancelScheduledConversion(selectedConversion.id);

    if (!result.ok) {
      clientLogger.error(`Failed to cancel scheduled conversion`, {
        conversionId: selectedConversion.id,
        error: result.error,
      });
      showErrorToast(
        getErrorMessageForUser(
          result.error.code,
          getLocalToastMessage(localToastKeys.SCHEDULED_CONVERSION_CANCEL_FAILED),
        ),
        { code: result.error.code },
      );
      setIsLoading(false);
      return;
    }

    showSuccessToast(`Scheduled conversion cancelled`);
    setIsCancelModalOpen(false);
    setSelectedConversion(null);
    setIsLoading(false);
    router.refresh();
  };

  const getStatusVariant = (status: string): `default` | `success` | `warning` | `error` | `info` => {
    const normalized = status.toLowerCase();
    if (normalized === `pending` || normalized === `scheduled`) return `warning`;
    if (normalized === `completed` || normalized === `executed`) return `success`;
    if (normalized === `cancelled` || normalized === `canceled`) return `default`;
    if (normalized === `failed` || normalized === `error`) return `error`;
    return `warning`;
  };

  if (conversions.length === 0) {
    return (
      <div
        className={`
  mx-auto
  max-w-md
  space-y-4
  p-4
        `}
      >
        <h1
          className={`
  text-xl
  font-semibold
  text-slate-800
  dark:text-slate-200
          `}
        >
          Scheduled conversions
        </h1>

        <EmptyState
          title="No scheduled conversions"
          description="You don't have any scheduled currency conversions at the moment."
          action={{
            label: `Go to Exchange`,
            onClick: () => router.push(`/exchange`),
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`
  mx-auto
  max-w-md
  space-y-4
  p-4
      `}
    >
      <h1
        className={`
  text-xl
  font-semibold
  text-slate-800
  dark:text-slate-200
        `}
      >
        Scheduled conversions
      </h1>

      <div className={`space-y-3`}>
        {conversions.map((conversion) => (
          <div
            key={conversion.id}
            className={`
  rounded-lg
  border
  border-slate-200
  bg-white
  p-4
  dark:border-slate-700
  dark:bg-slate-800
            `}
          >
            <div className={`flex items-start justify-between`}>
              <div className={`flex-1`}>
                <div className={`flex items-center gap-2`}>
                  <h3
                    className={`
  text-sm
  font-semibold
  text-slate-900
  dark:text-white
                    `}
                  >
                    {conversion.amount} {conversion.fromCurrency} → {conversion.toCurrency}
                  </h3>
                  <StatusBadge status={conversion.status} variant={getStatusVariant(conversion.status)} />
                </div>
                <p
                  className={`
  mt-1
  text-xs
  text-slate-600
  dark:text-slate-400
                  `}
                >
                  Scheduled: {new Date(conversion.scheduledAt).toLocaleString()}
                </p>
                <p
                  className={`
  mt-0.5
  text-xs
  text-slate-500
  dark:text-slate-500
                  `}
                >
                  Created: {new Date(conversion.createdAt).toLocaleDateString()}
                </p>
              </div>

              {(conversion.status.toLowerCase() === `pending` || conversion.status.toLowerCase() === `scheduled`) && (
                <button
                  onClick={() => openCancelModal(conversion)}
                  className={`
  min-h-11
  min-w-11
  rounded-lg
  p-2
  text-red-600
  transition-colors
  hover:bg-red-50
  focus:outline-hidden
  focus:ring-2
  focus:ring-red-500
  dark:text-red-400
  dark:hover:bg-red-900/20
                  `}
                  aria-label="Cancel conversion"
                >
                  <XIcon className={`h-5 w-5`} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancel scheduled conversion"
        message={`Are you sure you want to cancel this scheduled conversion of ${selectedConversion?.amount ?? ``} ${selectedConversion?.fromCurrency ?? ``} → ${selectedConversion?.toCurrency ?? ``}?`}
        confirmText="Cancel conversion"
        cancelText="Keep conversion"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
