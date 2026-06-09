'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import {
  buildExchangePaginationHref,
  type Currency,
  type ExchangeMessage,
  type ExchangeMutationResult,
  FieldHint,
  formatMajorCurrency,
  formatMinorCurrency,
  formatScheduledSecondaryStatus,
  formatScheduleStatus,
  getExchangeCurrencyOptions,
  type ScheduleData,
  type ScheduledConversion,
  toDateTimeLocalValue,
} from './exchange-shared';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { MetricLine } from '../../../shared/ui/shell-data-display';
import { shellGridForm2 } from '../../../shared/ui/shell-grid-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

type ExchangeScheduledSectionProps = {
  scheduled: ScheduledConversion[];
  currencies: Currency[];
  balances: Record<string, number> | null;
  scheduledTotal: number;
  scheduledPage: number;
  scheduledPageSize: number;
  initialFromCurrency: string;
  initialToCurrency: string;
  onSchedule: (data: ScheduleData) => Promise<ExchangeMutationResult>;
  onCancel: (id: string) => Promise<ExchangeMutationResult>;
  headerAction?: ReactNode;
};

export function ExchangeScheduledSection({
  scheduled,
  currencies,
  balances,
  scheduledTotal,
  scheduledPage,
  scheduledPageSize,
  initialFromCurrency,
  initialToCurrency,
  onSchedule,
  onCancel,
  headerAction,
}: ExchangeScheduledSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<ExchangeMessage | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleData>({
    from: initialFromCurrency,
    to: initialToCurrency,
    amount: ``,
    executeAt: ``,
  });
  const [scheduledFilter, setScheduledFilter] = useState<`all` | `pending` | `history`>(`all`);

  const currencyOptions = getExchangeCurrencyOptions(currencies);
  const selectedBalanceMinor = balances?.[scheduleForm.from] ?? 0;
  const scheduleCurrenciesDiffer = scheduleForm.from !== scheduleForm.to;
  const scheduleAmountValue = scheduleForm.amount.trim();
  const scheduleAmount = Number(scheduleForm.amount);
  const hasValidScheduleAmount = scheduleAmountValue !== `` && Number.isFinite(scheduleAmount) && scheduleAmount > 0;
  const scheduleExecuteAtDate = scheduleForm.executeAt ? new Date(scheduleForm.executeAt) : null;
  const scheduleDateValid = scheduleExecuteAtDate != null && !Number.isNaN(scheduleExecuteAtDate.getTime());
  const scheduleIsFuture = scheduleDateValid && scheduleExecuteAtDate.getTime() > Date.now();
  const scheduleFormValid =
    scheduleCurrenciesDiffer && hasValidScheduleAmount && Boolean(scheduleForm.executeAt) && scheduleIsFuture;
  const pendingScheduledCount = scheduled.filter((conversion) => conversion.status === `PENDING`).length;
  const historyScheduledCount = scheduled.length - pendingScheduledCount;
  const scheduledTotalPages = Math.max(1, Math.ceil(scheduledTotal / scheduledPageSize));
  const filteredScheduled = [...scheduled]
    .filter((conversion) => {
      if (scheduledFilter === `pending`) return conversion.status === `PENDING`;
      if (scheduledFilter === `history`) return conversion.status !== `PENDING`;
      return true;
    })
    .sort((left, right) => {
      if (left.status === `PENDING` && right.status !== `PENDING`) return -1;
      if (left.status !== `PENDING` && right.status === `PENDING`) return 1;
      return new Date(left.executeAt).getTime() - new Date(right.executeAt).getTime();
    });

  const updateScheduleForm = (patch: Partial<ScheduleData>) => {
    setScheduleForm((current) => ({ ...current, ...patch }));
    setMessage(null);
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      from: initialFromCurrency,
      to: initialToCurrency,
      amount: ``,
      executeAt: ``,
    });
  };

  const handleMutationResult = (result: ExchangeMutationResult) => {
    if (!result.ok) {
      if (handleSessionExpiredError(result.error)) return false;
      setMessage({ type: `error`, text: result.error.message });
      return false;
    }
    return true;
  };

  const applyScheduledPage = (nextPage: number) => {
    router.push(
      buildExchangePaginationHref(pathname, searchParams.toString(), {
        scheduledPage: String(nextPage),
        scheduledPageSize: String(scheduledPageSize),
      }),
    );
  };

  return (
    <Panel
      title="Scheduled conversions"
      data-testid={`exchange-scheduled-section`}
      aside={
        <div className="flex flex-col items-end gap-1 text-right">
          <span>{`Page ${scheduledPage} of ${scheduledTotalPages} · ${scheduled.length} shown · ${scheduledTotal} total`}</span>
          {headerAction}
        </div>
      }
    >
      {message ? (
        <div
          className={
            message.type === `error`
              ? `mb-4 rounded-2xl border border-transparent bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)`
              : `mb-4 rounded-2xl border border-transparent bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)`
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="mb-4 space-y-3" data-testid={`exchange-schedule-form`}>
        <div className={shellGridForm2}>
          <MetricLine label="Pending" value={String(pendingScheduledCount)} />
          <MetricLine label="History" value={String(historyScheduledCount)} />
        </div>
        <div className={shellGridForm2}>
          <select
            aria-label={`Source currency for scheduled conversion`}
            value={scheduleForm.from}
            onChange={(event) => updateScheduleForm({ from: event.target.value })}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
          >
            {currencyOptions.map((currency) => (
              <option key={`scheduled-from-${currency.code}`} value={currency.code}>
                {`From: ${currency.code}`}
              </option>
            ))}
          </select>
          <select
            aria-label={`Target currency for scheduled conversion`}
            value={scheduleForm.to}
            onChange={(event) => updateScheduleForm({ to: event.target.value })}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
          >
            {currencyOptions.map((currency) => (
              <option key={`scheduled-to-${currency.code}`} value={currency.code}>
                {`To: ${currency.code}`}
              </option>
            ))}
          </select>
        </div>
        {!scheduleCurrenciesDiffer ? <FieldHint message="Choose two different currencies." tone="error" /> : null}
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="scheduled-amount">
            Amount
          </label>
          <input
            id="scheduled-amount"
            aria-label={`Amount to convert`}
            value={scheduleForm.amount}
            onChange={(event) => updateScheduleForm({ amount: event.target.value })}
            placeholder="Amount"
            aria-invalid={scheduleAmountValue !== `` && !hasValidScheduleAmount}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
          />
          <div className="mt-2 text-sm text-(--app-text-muted)">
            {`Current ${scheduleForm.from} balance: ${formatMinorCurrency(selectedBalanceMinor, scheduleForm.from)}`}
          </div>
          {scheduleAmountValue === `` ? <FieldHint message="Enter an amount greater than zero." /> : null}
          {scheduleAmountValue !== `` && !hasValidScheduleAmount ? (
            <FieldHint message="Amount must be greater than zero." tone="error" />
          ) : null}
          {hasValidScheduleAmount && Math.round(scheduleAmount * 100) > selectedBalanceMinor ? (
            <div className="mt-2 text-sm text-(--app-warning-text)">
              Scheduled amount is above the current balance. This may still succeed later if funds arrive before
              execution.
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="scheduled-execute-at">
            Execute at
          </label>
          <input
            id="scheduled-execute-at"
            type="datetime-local"
            aria-label={`Scheduled execution date and time`}
            aria-describedby="scheduled-execute-at-help"
            min={toDateTimeLocalValue(new Date(Date.now() + 60_000))}
            value={scheduleForm.executeAt}
            onChange={(event) => updateScheduleForm({ executeAt: event.target.value })}
            aria-invalid={scheduleForm.executeAt !== `` && !scheduleIsFuture}
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none"
          />
          <div id="scheduled-execute-at-help" className="mt-2 text-sm text-(--app-text-muted)">
            Use your local date and time, or pick it from the calendar control.
          </div>
          {!scheduleForm.executeAt ? <FieldHint message="Choose a future execution time." /> : null}
          {scheduleForm.executeAt && !scheduleDateValid ? (
            <FieldHint message="Choose a valid date and time." tone="error" />
          ) : null}
          {scheduleForm.executeAt && !scheduleIsFuture ? (
            <FieldHint message="Choose a time in the future." tone="error" />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              updateScheduleForm({
                executeAt: toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)),
              });
            }}
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            +1 hour
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const tomorrowMorning = new Date();
              tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
              tomorrowMorning.setHours(9, 0, 0, 0);
              updateScheduleForm({
                executeAt: toDateTimeLocalValue(tomorrowMorning),
              });
            }}
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tomorrow 9:00
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              resetScheduleForm();
              setMessage(null);
            }}
            className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear form
          </button>
        </div>
        <button
          type="button"
          disabled={isPending || !scheduleFormValid}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await onSchedule(scheduleForm);
              if (!handleMutationResult(result)) return;
              resetScheduleForm();
              setMessage({
                type: `success`,
                text: result.ok ? (result.message ?? `Scheduled conversion created`) : `Scheduled conversion created`,
              });
              router.refresh();
            });
          }}
          className="w-full rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-primary-contrast) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Saving...` : scheduleFormValid ? `Schedule conversion` : `Complete schedule details`}
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="scheduled-filter">
          Filter
        </label>
        <select
          id="scheduled-filter"
          value={scheduledFilter}
          onChange={(event) => setScheduledFilter(event.target.value as `all` | `pending` | `history`)}
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
        >
          <option value="all">All scheduled conversions</option>
          <option value="pending">Pending only</option>
          <option value="history">History only</option>
        </select>
      </div>

      <div data-testid={`exchange-scheduled-list`}>
        {filteredScheduled.length === 0 ? (
          <div className={shellEmptyState}>
            {scheduled.length === 0 ? `No scheduled conversions yet.` : `No conversions match the current filter.`}
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
                      onClick={() => {
                        setMessage(null);
                        setPendingActionId(`cancel:${conversion.id}`);
                        startTransition(async () => {
                          const result = await onCancel(conversion.id);
                          setPendingActionId(null);
                          if (!handleMutationResult(result)) return;
                          setMessage({
                            type: `success`,
                            text: result.ok
                              ? (result.message ?? `Scheduled conversion cancelled`)
                              : `Scheduled conversion cancelled`,
                          });
                          router.refresh();
                        });
                      }}
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

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={scheduledPage <= 1}
          onClick={() => applyScheduledPage(scheduledPage - 1)}
          className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={scheduledPage >= scheduledTotalPages}
          onClick={() => applyScheduledPage(scheduledPage + 1)}
          className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </Panel>
  );
}
