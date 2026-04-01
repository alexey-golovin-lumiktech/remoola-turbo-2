'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  cancelScheduledExchangeMutation,
  convertExchangeMutation,
  createExchangeRuleMutation,
  deleteExchangeRuleMutation,
  getExchangeQuoteMutation,
  refreshExchangeRatesMutation,
  scheduleExchangeMutation,
  updateExchangeRuleMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { MetricLine, Panel } from '../../../shared/ui/shell-primitives';

type Currency = {
  code: string;
  symbol: string;
  name?: string;
};

type ExchangeRate = {
  from: string;
  to: string;
  rate: number | null;
  status: `available` | `stale` | `unavailable`;
};

type ExchangeRule = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetBalance: number;
  maxConvertAmount: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
};

type ScheduledConversion = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  executeAt: string;
  status: string;
};

type Quote = {
  from: string;
  to: string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
};

type Props = {
  currencies: Currency[];
  balances: Record<string, number> | null;
  rules: ExchangeRule[];
  rulesTotal: number;
  rulesPage: number;
  rulesPageSize: number;
  scheduled: ScheduledConversion[];
  scheduledTotal: number;
  scheduledPage: number;
  scheduledPageSize: number;
  exchangeRates: ExchangeRate[];
  exchangeRatesUnavailable: boolean;
  initialRatePairs: Array<{ from: string; to: string }>;
  initialFromCurrency: string;
  initialToCurrency: string;
};

function formatMinorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount / 100);
}

function formatMajorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatScheduleStatus(status: string) {
  switch (status) {
    case `PENDING`:
      return { label: `Pending`, className: `text-amber-100 border-amber-400/20 bg-amber-500/10` };
    case `CANCELLED`:
      return { label: `Cancelled`, className: `text-white/65 border-white/10 bg-white/5` };
    case `EXECUTED`:
      return { label: `Executed`, className: `text-emerald-100 border-emerald-400/20 bg-emerald-500/10` };
    case `FAILED`:
      return { label: `Failed`, className: `text-rose-100 border-rose-400/20 bg-rose-500/10` };
    case `PROCESSING`:
      return { label: `Processing`, className: `text-blue-100 border-blue-400/20 bg-blue-500/10` };
    default:
      return { label: status, className: `text-white/65 border-white/10 bg-white/5` };
  }
}

function formatRelativeExecution(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes <= 0) return `Due now`;
  if (diffMinutes < 60) return `In ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `In ${diffHours} hr`;
  const diffDays = Math.round(diffHours / 24);
  return `In ${diffDays} day${diffDays === 1 ? `` : `s`}`;
}

function formatScheduledSecondaryStatus(status: string, executeAt: string) {
  switch (status) {
    case `PENDING`:
      return formatRelativeExecution(executeAt);
    case `CANCELLED`:
      return `Will not execute`;
    case `EXECUTED`:
      return `Executed from scheduled request`;
    case `FAILED`:
      return `Execution attempt failed`;
    case `PROCESSING`:
      return `Execution in progress`;
    default:
      return `Status updated`;
  }
}

function getExchangeRateCardMeta(rate: ExchangeRate) {
  switch (rate.status) {
    case `available`:
      return {
        description: `Live backend rate`,
        value: rate.rate?.toFixed(4) ?? `Unavailable`,
        className: `border-white/10 bg-white/5`,
        valueClassName: `text-lg font-semibold text-white/90`,
      };
    case `stale`:
      return {
        description: `Latest rate is stale right now. Refresh to try again.`,
        value: `Stale`,
        className: `border-amber-400/20 bg-amber-500/10`,
        valueClassName: `text-sm font-medium text-amber-100`,
      };
    default:
      return {
        description: `An exchange rate for this pair is not available right now.`,
        value: `Unavailable`,
        className: `border-white/10 bg-white/5`,
        valueClassName: `text-sm font-medium text-white/55`,
      };
  }
}

function FieldHint({ message, tone = `muted` }: { message: string; tone?: `muted` | `error` }) {
  return <div className={`mt-2 text-xs ${tone === `error` ? `text-rose-200` : `text-white/35`}`}>{message}</div>;
}

export function ExchangeClient({
  currencies,
  balances,
  rules,
  rulesTotal,
  rulesPage,
  rulesPageSize,
  scheduled,
  scheduledTotal,
  scheduledPage,
  scheduledPageSize,
  exchangeRates,
  exchangeRatesUnavailable,
  initialRatePairs,
  initialFromCurrency,
  initialToCurrency,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleTargetBalanceTouched, setRuleTargetBalanceTouched] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [liveRates, setLiveRates] = useState(exchangeRates);
  const [liveRatesUnavailable, setLiveRatesUnavailable] = useState(exchangeRatesUnavailable);
  const [convertForm, setConvertForm] = useState({
    from: initialFromCurrency,
    to: initialToCurrency,
    amount: ``,
  });
  const [ruleForm, setRuleForm] = useState({
    from: initialFromCurrency,
    to: initialToCurrency,
    targetBalance: ``,
    maxConvertAmount: ``,
    minIntervalMinutes: `60`,
    enabled: true,
  });
  const [scheduleForm, setScheduleForm] = useState({
    from: initialFromCurrency,
    to: initialToCurrency,
    amount: ``,
    executeAt: ``,
  });
  const [scheduledFilter, setScheduledFilter] = useState<`all` | `pending` | `history`>(`all`);

  const currencyCodes =
    currencies.length > 0
      ? currencies
      : [
          { code: `USD`, symbol: `$` },
          { code: `EUR`, symbol: `E` },
        ];
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
  const rulesTotalPages = Math.max(1, Math.ceil(rulesTotal / rulesPageSize));
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

  useEffect(() => {
    setLiveRates(exchangeRates);
    setLiveRatesUnavailable(exchangeRatesUnavailable);
  }, [exchangeRates, exchangeRatesUnavailable]);

  const updateRuleForm = (patch: Partial<typeof ruleForm>) => {
    setRuleForm((current) => ({ ...current, ...patch }));
    setMessage(null);
  };
  const updateConvertForm = (patch: Partial<typeof convertForm>) => {
    setConvertForm((current) => ({ ...current, ...patch }));
    setQuote(null);
    setMessage(null);
  };
  const updateScheduleForm = (patch: Partial<typeof scheduleForm>) => {
    setScheduleForm((current) => ({ ...current, ...patch }));
    setMessage(null);
  };
  const pushPagination = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };
  const applyRulesPage = (nextPage: number) => {
    pushPagination({
      rulesPage: String(nextPage),
      rulesPageSize: String(rulesPageSize),
      scheduledPage: String(scheduledPage),
      scheduledPageSize: String(scheduledPageSize),
    });
  };
  const applyScheduledPage = (nextPage: number) => {
    pushPagination({
      rulesPage: String(rulesPage),
      rulesPageSize: String(rulesPageSize),
      scheduledPage: String(nextPage),
      scheduledPageSize: String(scheduledPageSize),
    });
  };
  const convertCurrenciesDiffer = convertForm.from !== convertForm.to;
  const convertAvailableBalanceMinor = balances?.[convertForm.from] ?? 0;
  const convertAmountValue = convertForm.amount.trim();
  const parsedConvertAmount = Number(convertAmountValue);
  const convertAmountValid =
    convertAmountValue !== `` && Number.isFinite(parsedConvertAmount) && parsedConvertAmount > 0;
  const requestedConvertMinorAmount = convertAmountValid ? Math.round(parsedConvertAmount * 100) : 0;
  const convertHasInsufficientFunds = convertAmountValid && requestedConvertMinorAmount > convertAvailableBalanceMinor;
  const convertFormValid = convertCurrenciesDiffer && convertAmountValid;
  const ruleCurrenciesDiffer = ruleForm.from !== ruleForm.to;
  const targetBalanceValue = ruleForm.targetBalance.trim();
  const targetBalanceMissing = targetBalanceValue === ``;
  const parsedTargetBalance = targetBalanceMissing ? Number.NaN : Number(targetBalanceValue);
  const targetBalanceValid = !targetBalanceMissing && Number.isFinite(parsedTargetBalance) && parsedTargetBalance >= 0;
  const targetBalanceShowError = ruleTargetBalanceTouched && !targetBalanceValid;
  const maxConvertAmountValue = ruleForm.maxConvertAmount.trim();
  const maxConvertAmountProvided = maxConvertAmountValue !== ``;
  const parsedMaxConvertAmount = maxConvertAmountProvided ? Number(maxConvertAmountValue) : Number.NaN;
  const maxConvertAmountValid =
    !maxConvertAmountProvided || (Number.isFinite(parsedMaxConvertAmount) && parsedMaxConvertAmount > 0);
  const minIntervalValue = ruleForm.minIntervalMinutes.trim();
  const minIntervalProvided = minIntervalValue !== ``;
  const parsedMinInterval = minIntervalProvided ? Number(minIntervalValue) : Number.NaN;
  const minIntervalValid = !minIntervalProvided || (Number.isFinite(parsedMinInterval) && parsedMinInterval >= 1);
  const ruleFormValid = ruleCurrenciesDiffer && targetBalanceValid && maxConvertAmountValid && minIntervalValid;

  const resetRuleEditor = () => {
    setEditingRuleId(null);
    setRuleTargetBalanceTouched(false);
    setRuleForm({
      from: initialFromCurrency,
      to: initialToCurrency,
      targetBalance: ``,
      maxConvertAmount: ``,
      minIntervalMinutes: `60`,
      enabled: true,
    });
  };

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={
            message.type === `error`
              ? `rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200`
              : `rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200`
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Exchange form">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={convertForm.from}
                onChange={(event) => updateConvertForm({ from: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
              >
                {currencyCodes.map((currency) => (
                  <option key={`from-${currency.code}`} value={currency.code}>
                    From: {currency.code}
                  </option>
                ))}
              </select>
              <select
                value={convertForm.to}
                onChange={(event) => updateConvertForm({ to: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
              >
                {currencyCodes.map((currency) => (
                  <option key={`to-${currency.code}`} value={currency.code}>
                    To: {currency.code}
                  </option>
                ))}
              </select>
            </div>
            {!convertCurrenciesDiffer ? <FieldHint message="Choose two different currencies." tone="error" /> : null}
            <input
              value={convertForm.amount}
              onChange={(event) => updateConvertForm({ amount: event.target.value })}
              placeholder="Amount to convert"
              aria-invalid={convertAmountValue !== `` && !convertAmountValid}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
            />
            {convertAmountValue === `` ? <FieldHint message="Enter an amount greater than zero." /> : null}
            {convertAmountValue !== `` && !convertAmountValid ? (
              <FieldHint message="Amount must be greater than zero." tone="error" />
            ) : null}
            <MetricLine
              label="Available balance"
              value={formatMinorCurrency(convertAvailableBalanceMinor, convertForm.from)}
            />
            {convertHasInsufficientFunds ? (
              <FieldHint message="Amount exceeds the currently available balance." tone="error" />
            ) : null}
            {quote ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="text-sm text-white/60">
                  Quote: {quote.from} {`->`} {quote.to} at {quote.rate.toFixed(4)}
                </div>
                <div className="mt-2 text-lg font-semibold text-white/90">
                  {formatMajorCurrency(quote.targetAmount, quote.to)}
                </div>
                <div className="mt-1 text-sm text-white/50">
                  From {formatMajorCurrency(quote.sourceAmount, quote.from)}
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="button"
                disabled={isPending || !convertFormValid}
                onClick={() => {
                  setMessage(null);
                  startTransition(async () => {
                    const result = await getExchangeQuoteMutation(convertForm);
                    if (!result.ok) {
                      if (handleSessionExpiredError(result.error)) return;
                      setMessage({ type: `error`, text: result.error.message });
                      setQuote(null);
                      return;
                    }
                    setQuote(result.data);
                  });
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? `Loading...` : `Get quote`}
              </button>
              <button
                type="button"
                disabled={isPending || !convertFormValid || convertHasInsufficientFunds}
                onClick={() => {
                  setMessage(null);
                  startTransition(async () => {
                    const result = await convertExchangeMutation(convertForm);
                    if (!result.ok) {
                      if (handleSessionExpiredError(result.error)) return;
                      setMessage({ type: `error`, text: result.error.message });
                      return;
                    }
                    setConvertForm((current) => ({ ...current, amount: `` }));
                    setQuote(null);
                    setMessage({ type: `success`, text: result.message ?? `Exchange completed` });
                    router.refresh();
                  });
                }}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-[#05261c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? `Submitting...`
                  : convertHasInsufficientFunds
                    ? `Amount exceeds available balance`
                    : `Convert now`}
              </button>
            </div>
            <div className="text-sm text-white/45">
              {rulesTotal} auto-rules, {scheduledTotal} scheduled conversions
            </div>
          </div>
        </Panel>

        <Panel title="Live rates">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-white/90">Refresh live rates</div>
                <div className="mt-1 text-sm text-white/45">
                  Retry the current rate cards without reloading balances, rules, or scheduled conversions.
                </div>
              </div>
              <button
                type="button"
                disabled={isRefreshingRates || initialRatePairs.length === 0}
                onClick={async () => {
                  setMessage(null);
                  setIsRefreshingRates(true);
                  const result = await refreshExchangeRatesMutation({
                    pairs:
                      liveRates.length > 0
                        ? liveRates.map((rate) => ({ from: rate.from, to: rate.to }))
                        : initialRatePairs,
                  });
                  setIsRefreshingRates(false);
                  if (!result.ok) {
                    if (handleSessionExpiredError(result.error)) return;
                    setMessage({ type: `error`, text: result.error.message });
                    return;
                  }
                  setLiveRates(result.data.items);
                  setLiveRatesUnavailable(result.data.unavailable);
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefreshingRates ? `Refreshing...` : `Refresh rates`}
              </button>
            </div>

            {liveRatesUnavailable || liveRates.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
                Exchange rates are currently unavailable.
              </div>
            ) : (
              liveRates.map((rate) => {
                const meta = getExchangeRateCardMeta(rate);
                return (
                  <div
                    key={`${rate.from}-${rate.to}`}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${meta.className}`}
                  >
                    <div>
                      <div className="font-medium text-white/90">
                        {rate.from} {`->`} {rate.to}
                      </div>
                      <div className="mt-1 text-sm text-white/45">{meta.description}</div>
                    </div>
                    <div className={meta.valueClassName}>{meta.value}</div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          title="Auto conversion rules"
          aside={`Page ${rulesPage} of ${rulesTotalPages} · ${rules.length} shown · ${rulesTotal} total`}
        >
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={ruleForm.from}
              onChange={(event) => updateRuleForm({ from: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
            >
              {currencyCodes.map((currency) => (
                <option key={`rule-from-${currency.code}`} value={currency.code}>
                  From: {currency.code}
                </option>
              ))}
            </select>
            <select
              value={ruleForm.to}
              onChange={(event) => updateRuleForm({ to: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
            >
              {currencyCodes.map((currency) => (
                <option key={`rule-to-${currency.code}`} value={currency.code}>
                  To: {currency.code}
                </option>
              ))}
            </select>
            {!ruleCurrenciesDiffer ? (
              <div className="md:col-span-2">
                <FieldHint message="Choose two different currencies." tone="error" />
              </div>
            ) : null}
            <div>
              <input
                value={ruleForm.targetBalance}
                onChange={(event) => {
                  setRuleTargetBalanceTouched(true);
                  updateRuleForm({ targetBalance: event.target.value });
                }}
                placeholder="Target balance"
                aria-invalid={targetBalanceShowError}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
              <FieldHint
                message={
                  targetBalanceMissing
                    ? ruleTargetBalanceTouched
                      ? `Target balance is required.`
                      : `Enter a target balance to create a rule.`
                    : targetBalanceValid
                      ? `Zero is allowed.`
                      : `Enter a valid target balance.`
                }
                tone={targetBalanceShowError ? `error` : `muted`}
              />
            </div>
            <div>
              <input
                value={ruleForm.maxConvertAmount}
                onChange={(event) => updateRuleForm({ maxConvertAmount: event.target.value })}
                placeholder="Max convert amount (optional)"
                aria-invalid={!maxConvertAmountValid}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
              {maxConvertAmountProvided ? (
                <FieldHint
                  message={
                    maxConvertAmountValid ? `Cap will limit each run.` : `Enter a valid limit greater than zero.`
                  }
                  tone={maxConvertAmountValid ? `muted` : `error`}
                />
              ) : (
                <FieldHint message="Leave blank to remove the cap." />
              )}
            </div>
            <div>
              <input
                value={ruleForm.minIntervalMinutes}
                onChange={(event) => updateRuleForm({ minIntervalMinutes: event.target.value })}
                placeholder="Min interval minutes"
                aria-invalid={!minIntervalValid}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
              {minIntervalProvided ? (
                <FieldHint
                  message={
                    minIntervalValid
                      ? `Rule can run no more often than this interval.`
                      : `Interval must be at least 1 minute.`
                  }
                  tone={minIntervalValid ? `muted` : `error`}
                />
              ) : (
                <FieldHint
                  message={
                    editingRuleId ? `Leave blank to keep the current interval.` : `Leave blank to use 60 minutes.`
                  }
                />
              )}
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={ruleForm.enabled}
                onChange={(event) => updateRuleForm({ enabled: event.target.checked })}
              />
              Enable immediately
            </label>
          </div>
          <button
            type="button"
            disabled={isPending || !ruleFormValid}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const result = editingRuleId
                  ? await updateExchangeRuleMutation(editingRuleId, ruleForm)
                  : await createExchangeRuleMutation(ruleForm);
                if (!result.ok) {
                  if (handleSessionExpiredError(result.error)) return;
                  setMessage({ type: `error`, text: result.error.message });
                  return;
                }
                resetRuleEditor();
                setMessage({
                  type: `success`,
                  text: result.message ?? (editingRuleId ? `Rule updated` : `Rule created`),
                });
                router.refresh();
              });
            }}
            className="mb-3 w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? `Saving...` : editingRuleId ? `Save rule changes` : `Create rule`}
          </button>
          {editingRuleId ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                resetRuleEditor();
                setMessage(null);
              }}
              className="mb-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel edit
            </button>
          ) : null}

          {rules.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
              No auto-rules configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-white/90">
                        {rule.fromCurrency} {`->`} {rule.toCurrency}
                      </div>
                      <div className="mt-1 text-sm text-white/45">
                        Keep {formatMajorCurrency(rule.targetBalance, rule.fromCurrency)}
                        {rule.maxConvertAmount != null
                          ? ` • cap ${formatMajorCurrency(rule.maxConvertAmount, rule.fromCurrency)}`
                          : ``}
                        {` • every ${rule.minIntervalMinutes} min`}
                      </div>
                    </div>
                    <div className="text-sm text-white/60">{rule.enabled ? `Enabled` : `Paused`}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setEditingRuleId(rule.id);
                        setRuleTargetBalanceTouched(false);
                        setRuleForm({
                          from: rule.fromCurrency,
                          to: rule.toCurrency,
                          targetBalance: String(rule.targetBalance),
                          maxConvertAmount: rule.maxConvertAmount != null ? String(rule.maxConvertAmount) : ``,
                          minIntervalMinutes: String(rule.minIntervalMinutes),
                          enabled: rule.enabled,
                        });
                        setMessage(null);
                      }}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setMessage(null);
                        setPendingActionId(`toggle-rule:${rule.id}`);
                        startTransition(async () => {
                          const result = await updateExchangeRuleMutation(rule.id, { enabled: !rule.enabled });
                          setPendingActionId(null);
                          if (!result.ok) {
                            if (handleSessionExpiredError(result.error)) return;
                            setMessage({ type: `error`, text: result.error.message });
                            return;
                          }
                          if (editingRuleId === rule.id) {
                            setRuleForm((current) => ({ ...current, enabled: !rule.enabled }));
                          }
                          setMessage({ type: `success`, text: result.message ?? `Rule updated` });
                          router.refresh();
                        });
                      }}
                      className="rounded-xl border border-blue-400/20 px-3 py-2 text-sm text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pendingActionId === `toggle-rule:${rule.id}` ? `Updating...` : rule.enabled ? `Pause` : `Enable`}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setMessage(null);
                        setPendingActionId(`delete-rule:${rule.id}`);
                        startTransition(async () => {
                          const result = await deleteExchangeRuleMutation(rule.id);
                          setPendingActionId(null);
                          if (!result.ok) {
                            if (handleSessionExpiredError(result.error)) return;
                            setMessage({ type: `error`, text: result.error.message });
                            return;
                          }
                          if (editingRuleId === rule.id) {
                            resetRuleEditor();
                          }
                          setMessage({ type: `success`, text: result.message ?? `Rule deleted` });
                          router.refresh();
                        });
                      }}
                      className="rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pendingActionId === `delete-rule:${rule.id}` ? `Deleting...` : `Delete`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={rulesPage <= 1}
              onClick={() => applyRulesPage(rulesPage - 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={rulesPage >= rulesTotalPages}
              onClick={() => applyRulesPage(rulesPage + 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </Panel>

        <Panel
          title="Scheduled conversions"
          aside={`Page ${scheduledPage} of ${scheduledTotalPages} · ${scheduled.length} shown · ${scheduledTotal} total`}
        >
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MetricLine label="Pending" value={String(pendingScheduledCount)} />
              <MetricLine label="History" value={String(historyScheduledCount)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={scheduleForm.from}
                onChange={(event) => updateScheduleForm({ from: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
              >
                {currencyCodes.map((currency) => (
                  <option key={`scheduled-from-${currency.code}`} value={currency.code}>
                    From: {currency.code}
                  </option>
                ))}
              </select>
              <select
                value={scheduleForm.to}
                onChange={(event) => updateScheduleForm({ to: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
              >
                {currencyCodes.map((currency) => (
                  <option key={`scheduled-to-${currency.code}`} value={currency.code}>
                    To: {currency.code}
                  </option>
                ))}
              </select>
            </div>
            {!scheduleCurrenciesDiffer ? <FieldHint message="Choose two different currencies." tone="error" /> : null}
            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="scheduled-amount">
                Amount
              </label>
              <input
                id="scheduled-amount"
                value={scheduleForm.amount}
                onChange={(event) => updateScheduleForm({ amount: event.target.value })}
                placeholder="Amount"
                aria-invalid={scheduleAmountValue !== `` && !hasValidScheduleAmount}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              />
              <div className="mt-2 text-sm text-white/45">
                Current {scheduleForm.from} balance: {formatMinorCurrency(selectedBalanceMinor, scheduleForm.from)}
              </div>
              {scheduleAmountValue === `` ? <FieldHint message="Enter an amount greater than zero." /> : null}
              {scheduleAmountValue !== `` && !hasValidScheduleAmount ? (
                <FieldHint message="Amount must be greater than zero." tone="error" />
              ) : null}
              {hasValidScheduleAmount && Math.round(scheduleAmount * 100) > selectedBalanceMinor ? (
                <div className="mt-2 text-sm text-amber-100">
                  Scheduled amount is above the current balance. This may still succeed later if funds arrive before
                  execution.
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/55" htmlFor="scheduled-execute-at">
                Execute at
              </label>
              <input
                id="scheduled-execute-at"
                type="datetime-local"
                aria-describedby="scheduled-execute-at-help"
                min={toDateTimeLocalValue(new Date(Date.now() + 60_000))}
                value={scheduleForm.executeAt}
                onChange={(event) => updateScheduleForm({ executeAt: event.target.value })}
                aria-invalid={scheduleForm.executeAt !== `` && !scheduleIsFuture}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
              <div id="scheduled-execute-at-help" className="mt-2 text-sm text-white/45">
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
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tomorrow 9:00
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  updateScheduleForm({
                    from: initialFromCurrency,
                    to: initialToCurrency,
                    amount: ``,
                    executeAt: ``,
                  });
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
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
                  const result = await scheduleExchangeMutation(scheduleForm);
                  if (!result.ok) {
                    if (handleSessionExpiredError(result.error)) return;
                    setMessage({ type: `error`, text: result.error.message });
                    return;
                  }
                  setScheduleForm({
                    from: initialFromCurrency,
                    to: initialToCurrency,
                    amount: ``,
                    executeAt: ``,
                  });
                  setMessage({ type: `success`, text: result.message ?? `Scheduled conversion created` });
                  router.refresh();
                });
              }}
              className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? `Saving...` : scheduleFormValid ? `Schedule conversion` : `Complete schedule details`}
            </button>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm text-white/55" htmlFor="scheduled-filter">
              Filter
            </label>
            <select
              id="scheduled-filter"
              value={scheduledFilter}
              onChange={(event) => setScheduledFilter(event.target.value as `all` | `pending` | `history`)}
              className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
            >
              <option value="all">All scheduled conversions</option>
              <option value="pending">Pending only</option>
              <option value="history">History only</option>
            </select>
          </div>

          {filteredScheduled.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
              {scheduled.length === 0 ? `No scheduled conversions yet.` : `No conversions match the current filter.`}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScheduled.map((conversion) => {
                const statusMeta = formatScheduleStatus(conversion.status);
                return (
                  <div key={conversion.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-white/90">
                          {conversion.fromCurrency} {`->`} {conversion.toCurrency}
                        </div>
                        <div className="mt-1 text-sm text-white/45">
                          {formatMajorCurrency(conversion.amount, conversion.fromCurrency)} •{` `}
                          {new Date(conversion.executeAt).toLocaleString()}
                        </div>
                        <div className="mt-2 text-xs text-white/35">
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
                            const result = await cancelScheduledExchangeMutation(conversion.id);
                            setPendingActionId(null);
                            if (!result.ok) {
                              if (handleSessionExpiredError(result.error)) return;
                              setMessage({ type: `error`, text: result.error.message });
                              return;
                            }
                            setMessage({ type: `success`, text: result.message ?? `Scheduled conversion cancelled` });
                            router.refresh();
                          });
                        }}
                        className="mt-4 rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingActionId === `cancel:${conversion.id}` ? `Cancelling...` : `Cancel`}
                      </button>
                    ) : (
                      <div className="mt-4 text-sm text-white/45">
                        This conversion is already {conversion.status.toLowerCase()}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={scheduledPage <= 1}
              onClick={() => applyScheduledPage(scheduledPage - 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={scheduledPage >= scheduledTotalPages}
              onClick={() => applyScheduledPage(scheduledPage + 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </Panel>
      </section>
    </div>
  );
}
