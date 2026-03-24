'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  CURRENCY_CODE,
  type TCurrencyCode,
  SCHEDULED_FX_CONVERSION_STATUS,
  CURRENCY_CODES,
  toCurrencyOrDefault,
} from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { ScheduledConversionModal } from './ScheduledConversionModal';
import localStyles from './ScheduledConversionsPageClient.module.css';
import { formatDateTimeForDisplay } from '../../lib/date-utils';
import { usePreferredCurrency } from '../../lib/hooks';
import { PaginationBar } from '../ui';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const { contactsAddButton, filterRowControlHeight } = styles;

type ScheduledConversion = {
  id: string;
  fromCurrency: TCurrencyCode;
  toCurrency: TCurrencyCode;
  amount: number;
  status: string;
  executeAt: string;
  attempts: number;
  lastError?: string | null;
};

type ScheduleForm = {
  fromCurrency: TCurrencyCode;
  toCurrency: TCurrencyCode;
  amount: string;
  executeAt: string;
};

const defaultForm: ScheduleForm = {
  fromCurrency: CURRENCY_CODE.USD,
  toCurrency: CURRENCY_CODE.EUR,
  amount: ``,
  executeAt: ``,
};

export function ScheduledConversionsPageClient() {
  const { preferredCurrency, loaded: settingsLoaded } = usePreferredCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [scheduled, setScheduled] = useState<ScheduledConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [currencies, setCurrencies] = useState([...CURRENCY_CODES]);
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
      toCurrency: toCurrencyOrDefault(preferredCurrency, CURRENCY_CODE.USD),
    }));
  }, [settingsLoaded, currencies, preferredCurrency]);

  function resetForm() {
    preferredAppliedRef.current = false;
    setForm(defaultForm);
    setModalOpen(false);
  }

  function openCreateModal() {
    preferredAppliedRef.current = false;
    setForm(defaultForm);
    setModalOpen(true);
  }

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

      resetForm();
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
    <div className={localStyles.pageRoot}>
      <div className={localStyles.toolbar}>
        <button
          type="button"
          onClick={openCreateModal}
          className={cn(contactsAddButton, filterRowControlHeight, localStyles.createButton)}
        >
          Schedule conversion
        </button>
      </div>

      {total > 0 && (
        <PaginationBar
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loadingList}
          showPageInfo={false}
        />
      )}

      {scheduled.length === 0 && !loadingList && (
        <div className={localStyles.emptyState}>No scheduled conversions.</div>
      )}

      <div className={localStyles.conversionsList}>
        {scheduled.map((item) => (
          <article key={item.id} className={localStyles.conversionRow}>
            <div className={localStyles.conversionHeader}>
              <div className={localStyles.conversionIdentity}>
                <div className={localStyles.conversionPrimary}>
                  {item.fromCurrency} → {item.toCurrency}
                </div>
                <div className={localStyles.statusWrap}>
                  <span className={localStyles.statusLabel}>Status</span>
                  <span
                    className={
                      item.status === SCHEDULED_FX_CONVERSION_STATUS.PENDING
                        ? localStyles.statusPending
                        : item.status === SCHEDULED_FX_CONVERSION_STATUS.EXECUTED
                          ? localStyles.statusCompleted
                          : localStyles.statusInactive
                    }
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            </div>

            <div className={localStyles.metaGrid}>
              <div className={localStyles.metaRow}>
                <span className={localStyles.metaLabel}>Amount</span>
                <span className={localStyles.metaValue}>{item.amount}</span>
              </div>
              <div className={localStyles.metaRow}>
                <span className={localStyles.metaLabel}>Execute at</span>
                <span className={localStyles.metaValue}>{formatDateTimeForDisplay(item.executeAt)}</span>
              </div>
              <div className={localStyles.metaRow}>
                <span className={localStyles.metaLabel}>Attempts</span>
                <span className={localStyles.metaValue}>{item.attempts}</span>
              </div>
              {item.lastError && (
                <div className={localStyles.metaRow}>
                  <span className={localStyles.metaLabel}>Last error</span>
                  <span className={localStyles.metaValue}>{item.lastError}</span>
                </div>
              )}
            </div>

            {item.status === SCHEDULED_FX_CONVERSION_STATUS.PENDING && (
              <div className={localStyles.actions}>
                <button className={localStyles.cancelAction} onClick={() => cancelConversion(item)} type="button">
                  Cancel
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      <ScheduledConversionModal
        open={modalOpen}
        heading="Schedule a conversion"
        submitLabel="Schedule conversion"
        loading={loading}
        currencies={currencies}
        form={form}
        onCloseAction={resetForm}
        onSubmitAction={submit}
        onAmountChange={(value) => setForm((prev) => ({ ...prev, amount: value }))}
        onFromCurrencyChange={(value) => setForm((prev) => ({ ...prev, fromCurrency: value }))}
        onToCurrencyChange={(value) => setForm((prev) => ({ ...prev, toCurrency: value }))}
        onExecuteAtChange={(value) => setForm((prev) => ({ ...prev, executeAt: value }))}
      />
    </div>
  );
}
