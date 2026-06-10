'use client';

import {
  formatMajorCurrency,
  formatScheduledSecondaryStatus,
  formatScheduleStatus,
  type ScheduledConversion,
} from './exchange-shared';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';

export function ExchangeScheduledList({
  filteredScheduled,
  isPending,
  onCancel,
  pendingActionId,
  totalScheduled,
}: {
  filteredScheduled: ScheduledConversion[];
  isPending: boolean;
  onCancel: (conversionId: string) => void;
  pendingActionId: string | null;
  totalScheduled: number;
}) {
  return (
    <div data-testid={`exchange-scheduled-list`}>
      {filteredScheduled.length === 0 ? (
        <div className={shellEmptyState}>
          {totalScheduled === 0 ? `No scheduled conversions yet.` : `No conversions match the current filter.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScheduled.map((conversion) => {
            const statusMeta = formatScheduleStatus(conversion.status);
            return (
              <div key={conversion.id} className={shellContainerBase}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-(--app-text)">
                      {conversion.fromCurrency} {`->`} {conversion.toCurrency}
                    </div>
                    <div className="mt-1 text-sm text-(--app-text-muted)">
                      {formatMajorCurrency(conversion.amount, conversion.fromCurrency)} •{` `}
                      {new Date(conversion.executeAt).toLocaleString()}
                    </div>
                    <div className="mt-2 text-xs text-(--app-text-faint)">
                      {formatScheduledSecondaryStatus(conversion.status, conversion.executeAt)}
                    </div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>
                    {statusMeta.label}
                  </div>
                </div>
                {conversion.status === `PENDING` ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onCancel(conversion.id)}
                    className="mt-4 rounded-xl border border-transparent bg-(--app-danger-soft) px-3 py-2 text-sm text-(--app-danger-text) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingActionId === `cancel:${conversion.id}` ? `Cancelling...` : `Cancel`}
                  </button>
                ) : (
                  <div className="mt-4 text-sm text-(--app-text-muted)">{`This conversion is already ${conversion.status.toLowerCase()}.`}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
