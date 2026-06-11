'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import {
  buildExchangePaginationHref,
  type Currency,
  type ExchangeMessage,
  type ExchangeMutationResult,
  getExchangeCurrencyOptions,
  type ScheduleData,
  type ScheduledConversion,
} from './exchange-shared';
import { ExchangeScheduledList } from './ExchangeScheduledList';
import { ExchangeScheduleFormSection } from './ExchangeScheduleFormSection';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Panel } from '../../../shared/ui/shell-panel';
import { ShellPagination } from '../../../shared/ui/ShellPagination';

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

  const handleClearForm = () => {
    resetScheduleForm();
    setMessage(null);
  };

  const handleScheduleSubmit = () => {
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
  };

  const handleCancelConversion = (conversionId: string) => {
    setMessage(null);
    setPendingActionId(`cancel:${conversionId}`);
    startTransition(async () => {
      const result = await onCancel(conversionId);
      setPendingActionId(null);
      if (!handleMutationResult(result)) return;
      setMessage({
        type: `success`,
        text: result.ok ? (result.message ?? `Scheduled conversion cancelled`) : `Scheduled conversion cancelled`,
      });
      router.refresh();
    });
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

      <ExchangeScheduleFormSection
        currencyOptions={currencyOptions}
        hasValidScheduleAmount={hasValidScheduleAmount}
        historyScheduledCount={historyScheduledCount}
        isPending={isPending}
        onClear={handleClearForm}
        onSubmit={handleScheduleSubmit}
        onUpdate={updateScheduleForm}
        pendingScheduledCount={pendingScheduledCount}
        scheduleAmount={scheduleAmount}
        scheduleAmountValue={scheduleAmountValue}
        scheduleCurrenciesDiffer={scheduleCurrenciesDiffer}
        scheduleDateValid={scheduleDateValid}
        scheduleForm={scheduleForm}
        scheduleFormValid={scheduleFormValid}
        scheduleIsFuture={scheduleIsFuture}
        selectedBalanceMinor={selectedBalanceMinor}
      />

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

      <ExchangeScheduledList
        filteredScheduled={filteredScheduled}
        isPending={isPending}
        onCancel={handleCancelConversion}
        pendingActionId={pendingActionId}
        totalScheduled={scheduled.length}
      />

      <ShellPagination
        onNext={() => applyScheduledPage(scheduledPage + 1)}
        onPrev={() => applyScheduledPage(scheduledPage - 1)}
        page={scheduledPage}
        totalPages={scheduledTotalPages}
      />
    </Panel>
  );
}
