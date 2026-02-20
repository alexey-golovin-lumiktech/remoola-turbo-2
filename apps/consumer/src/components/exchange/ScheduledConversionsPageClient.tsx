'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ALL_CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

import { formatDateTimeForDisplay } from '../../lib/date-utils';
import { firstOtherCurrency, usePreferredCurrency } from '../../lib/hooks';
import { AmountCurrencyInput, FormSelect, type FormSelectOption, PaginationBar } from '../ui';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const {
  exchangePageContainer,
  exchangePageTitle,
  exchangeCard,
  exchangeForm,
  exchangeLabel,
  exchangeField,
  exchangeButton,
  gridGap4,
  flexRowBetween,
  actionButtonDanger,
} = styles;

type ScheduledConversion = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  status: string;
  executeAt: string;
  attempts: number;
  lastError?: string | null;
};

type ScheduleForm = {
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  executeAt: string;
};

const defaultForm: ScheduleForm = {
  fromCurrency: ALL_CURRENCY_CODES[0],
  toCurrency: ALL_CURRENCY_CODES[1],
  amount: ``,
  executeAt: ``,
};

export function ScheduledConversionsPageClient() {
  const { preferredCurrency, loaded: settingsLoaded } = usePreferredCurrency();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [scheduled, setScheduled] = useState<ScheduledConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [currencies, setCurrencies] = useState<string[]>([...ALL_CURRENCY_CODES]);
  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const preferredAppliedRef = useRef(false);

  const loadScheduled = useCallback(async () => {
    setLoadingList(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`/api/exchange/scheduled?${params}`, { credentials: `include`, cache: `no-store` });
    setLoadingList(false);
    if (!res.ok) return;
    const data = await res.json();
    setScheduled(data.items ?? []);
    setTotal(Number(data?.total ?? 0));
  }, [page, pageSize]);

  useEffect(() => {
    void loadScheduled();
  }, [loadScheduled]);

  useEffect(() => {
    fetch(`/api/exchange/currencies`, { credentials: `include` })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setCurrencies(data);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!currencies.length) return;
    setForm((prev) => {
      const needSync = !currencies.includes(prev.fromCurrency) || !currencies.includes(prev.toCurrency);
      if (!needSync) return prev;
      return {
        ...prev,
        fromCurrency: currencies[0] ?? prev.fromCurrency,
        toCurrency: currencies[1] ?? currencies[0] ?? prev.toCurrency,
      };
    });
  }, [currencies]);

  useEffect(() => {
    if (!settingsLoaded || !currencies.length || preferredAppliedRef.current) return;
    if (!preferredCurrency || !currencies.includes(preferredCurrency)) return;
    preferredAppliedRef.current = true;
    setForm((prev) => ({
      ...prev,
      fromCurrency: preferredCurrency,
      toCurrency: firstOtherCurrency(currencies, preferredCurrency),
    }));
  }, [settingsLoaded, currencies, preferredCurrency]);

  async function submit() {
    const numericAmount = Number(form.amount?.replace(/,/g, ``) ?? 0);
    if (!form.amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error(`Please enter a valid amount.`);
      return;
    }
    const executeAtDate = form.executeAt ? new Date(form.executeAt) : null;
    if (!executeAtDate || !executeAtDate.getTime()) {
      toast.error(`Please select a date and time for the conversion.`);
      return;
    }
    if (executeAtDate.getTime() <= Date.now()) {
      toast.error(`Please select a future date and time.`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        from: form.fromCurrency,
        to: form.toCurrency,
        amount: numericAmount,
        executeAt: executeAtDate.toISOString(),
      };

      const res = await fetch(`/api/exchange/scheduled`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        toast.error(message || `Failed to schedule conversion`);
        return;
      }

      setForm(defaultForm);
      setPage(1);
      await loadScheduled();
    } finally {
      setLoading(false);
    }
  }

  async function cancelConversion(item: ScheduledConversion) {
    if (!confirm(`Cancel this scheduled conversion?`)) return;
    const res = await fetch(`/api/exchange/scheduled/${item.id}/cancel`, {
      method: `POST`,
      credentials: `include`,
    });
    if (!res.ok) {
      toast.error(`Failed to cancel scheduled conversion`);
      return;
    }
    await loadScheduled();
  }

  return (
    <div className={exchangePageContainer}>
      <h1 className={exchangePageTitle}>Scheduled Conversions</h1>

      <div className={`${exchangeCard} ${gridGap4}`}>
        <strong>Schedule a conversion</strong>
        <div className={exchangeForm}>
          <AmountCurrencyInput
            label={`Amount (${form.fromCurrency})`}
            amount={form.amount}
            onAmountChange={(v) => setForm((prev) => ({ ...prev, amount: v }))}
            currencyCode={form.fromCurrency as TCurrencyCode}
            onCurrencyChange={(v) => setForm((prev) => ({ ...prev, fromCurrency: v }))}
            currencyOptions={currencies.map((c) => ({ value: c, label: c }))}
            placeholder="0.00"
          />

          <FormSelect
            label="To currency"
            value={form.toCurrency}
            onChange={(v) => setForm((prev) => ({ ...prev, toCurrency: v }))}
            options={currencies.map((c) => ({ value: c, label: c })) as FormSelectOption[]}
            placeholder="Select currency..."
            isClearable={false}
          />

          <div>
            <label className={exchangeLabel}>Execute at</label>
            <input
              className={exchangeField}
              type="datetime-local"
              value={form.executeAt}
              onChange={(e) => setForm((prev) => ({ ...prev, executeAt: e.target.value }))}
            />
          </div>

          <button onClick={submit} disabled={loading} className={exchangeButton}>
            Schedule conversion
          </button>
        </div>
      </div>

      <div className={`${exchangeCard} ${gridGap4}`}>
        <strong>Upcoming and past</strong>
        {total > 0 && (
          <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} loading={loadingList} />
        )}
        {scheduled.length === 0 && !loadingList && <div>No scheduled conversions.</div>}
        {scheduled.map((item) => (
          <div key={item.id} className={flexRowBetween}>
            <div>
              <div>
                {item.fromCurrency} → {item.toCurrency} | {item.amount}
              </div>
              <div>
                execute {formatDateTimeForDisplay(item.executeAt)} | status {item.status} | attempts {item.attempts}
              </div>
              {item.lastError && <div>last error: {item.lastError}</div>}
            </div>
            {item.status === `PENDING` && (
              <button className={actionButtonDanger} onClick={() => cancelConversion(item)} type="button">
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
