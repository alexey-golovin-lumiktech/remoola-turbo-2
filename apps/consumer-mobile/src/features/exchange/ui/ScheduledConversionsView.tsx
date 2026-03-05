'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Modal } from '../../../shared/ui/Modal';
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
  const [error, setError] = useState<string | null>(null);

  const openCancelModal = (conversion: ScheduledConversion) => {
    setSelectedConversion(conversion);
    setError(null);
    setIsCancelModalOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedConversion) return;

    setIsLoading(true);
    setError(null);

    const result = await cancelScheduledConversion(selectedConversion.id);

    if (!result.ok) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

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
        className="
          mx-auto
          max-w-md
          space-y-4
          p-4
        "
      >
        <h1
          className="
            text-xl
            font-semibold
            text-slate-800
            dark:text-slate-200
          "
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
      className="
        mx-auto
        max-w-md
        space-y-4
        p-4
      "
    >
      <h1
        className="
          text-xl
          font-semibold
          text-slate-800
          dark:text-slate-200
        "
      >
        Scheduled conversions
      </h1>

      <div
        className="
          space-y-3
        "
      >
        {conversions.map((conversion) => (
          <div
            key={conversion.id}
            className="
              rounded-lg
              border
              border-slate-200
              bg-white
              p-4
              dark:border-slate-700
              dark:bg-slate-800
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div
                className="
                  flex-1
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <h3
                    className="
                      text-sm
                      font-semibold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    {conversion.amount} {conversion.fromCurrency} → {conversion.toCurrency}
                  </h3>
                  <StatusBadge status={conversion.status} variant={getStatusVariant(conversion.status)} />
                </div>
                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-600
                    dark:text-slate-400
                  "
                >
                  Scheduled: {new Date(conversion.scheduledAt).toLocaleString()}
                </p>
                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                    dark:text-slate-500
                  "
                >
                  Created: {new Date(conversion.createdAt).toLocaleDateString()}
                </p>
              </div>

              {(conversion.status.toLowerCase() === `pending` || conversion.status.toLowerCase() === `scheduled`) && (
                <button
                  onClick={() => openCancelModal(conversion)}
                  className="
                    min-h-[44px]
                    min-w-[44px]
                    rounded-lg
                    p-2
                    text-red-600
                    transition-colors
                    hover:bg-red-50
                    focus:outline-none
                    focus:ring-2
                    focus:ring-red-500
                    dark:text-red-400
                    dark:hover:bg-red-900/20
                  "
                  aria-label="Cancel conversion"
                >
                  <svg
                    className="
                      h-5
                      w-5
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel scheduled conversion">
        <div
          className="
            space-y-4
          "
        >
          {error && (
            <div
              className="
                rounded-lg
                bg-red-50
                p-3
                dark:bg-red-900/20
              "
            >
              <p
                className="
                  text-sm
                  text-red-800
                  dark:text-red-300
                "
              >
                {error}
              </p>
            </div>
          )}

          <p
            className="
              text-sm
              text-slate-600
              dark:text-slate-400
            "
          >
            Are you sure you want to cancel this scheduled conversion of{` `}
            <strong>
              {selectedConversion?.amount} {selectedConversion?.fromCurrency} → {selectedConversion?.toCurrency}
            </strong>
            ?
          </p>

          <div
            className="
              flex
              gap-2
              pt-2
            "
          >
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isLoading}
              className="
                flex-1
              "
            >
              Keep conversion
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleCancel}
              isLoading={isLoading}
              className="
                flex-1
              "
            >
              Cancel conversion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
