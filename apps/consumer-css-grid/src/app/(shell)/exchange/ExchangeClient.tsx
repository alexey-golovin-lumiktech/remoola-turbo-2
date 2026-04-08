'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  type CreateRuleData,
  type Currency,
  FieldHint,
  formatMajorCurrency,
  formatMinorCurrency,
  getExchangeCurrencyOptions,
  type ExchangeRate,
  type ExchangeRule,
  type ScheduledConversion,
  type ScheduleData,
  type UpdateRuleData,
} from './exchange-shared';
import { ExchangeRulesSection } from './ExchangeRulesSection';
import { ExchangeScheduledSection } from './ExchangeScheduledSection';
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

function getExchangeRateCardMeta(rate: ExchangeRate) {
  switch (rate.status) {
    case `available`:
      return {
        description: `Live backend rate`,
        value: rate.rate?.toFixed(4) ?? `Unavailable`,
        className: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
        valueClassName: `text-lg font-semibold text-[var(--app-text)]`,
      };
    case `stale`:
      return {
        description: `Latest rate is stale right now. Refresh to try again.`,
        value: `Stale`,
        className: `border-transparent bg-[var(--app-warning-soft)]`,
        valueClassName: `text-sm font-medium text-[var(--app-warning-text)]`,
      };
    default:
      return {
        description: `An exchange rate for this pair is not available right now.`,
        value: `Unavailable`,
        className: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
        valueClassName: `text-sm font-medium text-[var(--app-text-muted)]`,
      };
  }
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [liveRates, setLiveRates] = useState(exchangeRates);
  const [liveRatesUnavailable, setLiveRatesUnavailable] = useState(exchangeRatesUnavailable);
  const [convertForm, setConvertForm] = useState({
    from: initialFromCurrency,
    to: initialToCurrency,
    amount: ``,
  });
  const currencyOptions = getExchangeCurrencyOptions(currencies);

  useEffect(() => {
    setLiveRates(exchangeRates);
    setLiveRatesUnavailable(exchangeRatesUnavailable);
  }, [exchangeRates, exchangeRatesUnavailable]);

  const updateConvertForm = (patch: Partial<typeof convertForm>) => {
    setConvertForm((current) => ({ ...current, ...patch }));
    setQuote(null);
    setMessage(null);
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
  const handleCreateRule = (input: CreateRuleData) => createExchangeRuleMutation(input);
  const handleUpdateRule = (ruleId: string, input: UpdateRuleData) => updateExchangeRuleMutation(ruleId, input);
  const handleDeleteRule = (ruleId: string) => deleteExchangeRuleMutation(ruleId);
  const handleSchedule = (input: ScheduleData) => scheduleExchangeMutation(input);
  const handleCancelScheduled = (conversionId: string) => cancelScheduledExchangeMutation(conversionId);

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={
            message.type === `error`
              ? `rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger-text)]`
              : `rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]`
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Exchange form" data-testid={`exchange-convert-form`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={convertForm.from}
                onChange={(event) => updateConvertForm({ from: event.target.value })}
                className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-text)] outline-none"
              >
                {currencyOptions.map((currency) => (
                  <option key={`from-${currency.code}`} value={currency.code}>
                    From: {currency.code}
                  </option>
                ))}
              </select>
              <select
                value={convertForm.to}
                onChange={(event) => updateConvertForm({ to: event.target.value })}
                className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-text)] outline-none"
              >
                {currencyOptions.map((currency) => (
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
              className="w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
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
              <div className="rounded-2xl border border-transparent bg-[var(--app-success-soft)] p-4">
                <div className="text-sm text-[var(--app-text-muted)]">
                  Quote: {quote.from} {`->`} {quote.to} at {quote.rate.toFixed(4)}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                  {formatMajorCurrency(quote.targetAmount, quote.to)}
                </div>
                <div className="mt-1 text-sm text-[var(--app-text-muted)]">
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
                className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 font-medium text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? `Submitting...`
                  : convertHasInsufficientFunds
                    ? `Amount exceeds available balance`
                    : `Convert now`}
              </button>
            </div>
            <div className="text-sm text-[var(--app-text-muted)]">
              {rulesTotal} auto-rules, {scheduledTotal} scheduled conversions
            </div>
          </div>
        </Panel>

        <Panel title="Live rates" data-testid={`exchange-live-rates`}>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-[var(--app-text)]">Refresh live rates</div>
                <div className="mt-1 text-sm text-[var(--app-text-muted)]">
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
                className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefreshingRates ? `Refreshing...` : `Refresh rates`}
              </button>
            </div>

            {liveRatesUnavailable || liveRates.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
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
                      <div className="font-medium text-[var(--app-text)]">
                        {rate.from} {`->`} {rate.to}
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-text-muted)]">{meta.description}</div>
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
        <ExchangeRulesSection
          rules={rules}
          currencies={currencies}
          rulesTotal={rulesTotal}
          rulesPage={rulesPage}
          rulesPageSize={rulesPageSize}
          initialFromCurrency={initialFromCurrency}
          initialToCurrency={initialToCurrency}
          onCreateRule={handleCreateRule}
          onUpdateRule={handleUpdateRule}
          onDeleteRule={handleDeleteRule}
          headerAction={
            <Link href="/exchange/rules" className="text-[var(--app-primary)] hover:underline">
              View all →
            </Link>
          }
        />

        <ExchangeScheduledSection
          scheduled={scheduled}
          currencies={currencies}
          balances={balances}
          scheduledTotal={scheduledTotal}
          scheduledPage={scheduledPage}
          scheduledPageSize={scheduledPageSize}
          initialFromCurrency={initialFromCurrency}
          initialToCurrency={initialToCurrency}
          onSchedule={handleSchedule}
          onCancel={handleCancelScheduled}
          headerAction={
            <Link href="/exchange/scheduled" className="text-[var(--app-primary)] hover:underline">
              View all →
            </Link>
          }
        />
      </section>
    </div>
  );
}
