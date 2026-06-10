'use client';

import { FieldHint, formatMinorCurrency, type ScheduleData, toDateTimeLocalValue } from './exchange-shared';
import { MetricLine } from '../../../shared/ui/shell-data-display';
import { shellGridForm2 } from '../../../shared/ui/shell-grid-tokens';

type CurrencyOption = { code: string };

export function ExchangeScheduleFormSection({
  currencyOptions,
  hasValidScheduleAmount,
  historyScheduledCount,
  isPending,
  onClear,
  onSubmit,
  onUpdate,
  pendingScheduledCount,
  scheduleAmount,
  scheduleAmountValue,
  scheduleCurrenciesDiffer,
  scheduleDateValid,
  scheduleForm,
  scheduleFormValid,
  scheduleIsFuture,
  selectedBalanceMinor,
}: {
  currencyOptions: CurrencyOption[];
  hasValidScheduleAmount: boolean;
  historyScheduledCount: number;
  isPending: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onUpdate: (patch: Partial<ScheduleData>) => void;
  pendingScheduledCount: number;
  scheduleAmount: number;
  scheduleAmountValue: string;
  scheduleCurrenciesDiffer: boolean;
  scheduleDateValid: boolean;
  scheduleForm: ScheduleData;
  scheduleFormValid: boolean;
  scheduleIsFuture: boolean;
  selectedBalanceMinor: number;
}) {
  return (
    <div className="mb-4 space-y-3" data-testid={`exchange-schedule-form`}>
      <div className={shellGridForm2}>
        <MetricLine label="Pending" value={String(pendingScheduledCount)} />
        <MetricLine label="History" value={String(historyScheduledCount)} />
      </div>
      <div className={shellGridForm2}>
        <select
          aria-label={`Source currency for scheduled conversion`}
          value={scheduleForm.from}
          onChange={(event) => onUpdate({ from: event.target.value })}
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
          onChange={(event) => onUpdate({ to: event.target.value })}
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
          onChange={(event) => onUpdate({ amount: event.target.value })}
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
          onChange={(event) => onUpdate({ executeAt: event.target.value })}
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
            onUpdate({
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
            onUpdate({
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
          onClick={onClear}
          className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear form
        </button>
      </div>
      <button
        type="button"
        disabled={isPending || !scheduleFormValid}
        onClick={onSubmit}
        className="w-full rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-primary-contrast) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `Saving...` : scheduleFormValid ? `Schedule conversion` : `Complete schedule details`}
      </button>
    </div>
  );
}
