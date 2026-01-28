'use client';

import { useEffect, useState } from 'react';

import styles from '../ui/classNames.module.css';

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

const CURRENCIES = [`USD`, `EUR`, `JPY`, `GBP`, `AUD`] as const;

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
  fromCurrency: `USD`,
  toCurrency: `EUR`,
  amount: ``,
  executeAt: ``,
};

export function ScheduledConversionsPageClient() {
  const [scheduled, setScheduled] = useState<ScheduledConversion[]>([]);
  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([...CURRENCIES]);

  async function loadScheduled() {
    const res = await fetch(`/api/exchange/scheduled`, { credentials: `include`, cache: `no-store` });
    if (!res.ok) return;
    const data = await res.json();
    setScheduled(data);
  }

  useEffect(() => {
    loadScheduled();
  }, []);

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
    if (!currencies.includes(form.fromCurrency) || !currencies.includes(form.toCurrency)) {
      setForm((prev) => ({
        ...prev,
        fromCurrency: currencies[0] ?? prev.fromCurrency,
        toCurrency: currencies[1] ?? currencies[0] ?? prev.toCurrency,
      }));
    }
  }, [currencies, form.fromCurrency, form.toCurrency]);

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        from: form.fromCurrency,
        to: form.toCurrency,
        amount: Number(form.amount),
        executeAt: new Date(form.executeAt).toISOString(),
      };

      const res = await fetch(`/api/exchange/scheduled`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        alert(message || `Failed to schedule conversion`);
        return;
      }

      setForm(defaultForm);
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
      alert(`Failed to cancel scheduled conversion`);
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
          <div>
            <label className={exchangeLabel}>From currency</label>
            <select
              className={exchangeField}
              value={form.fromCurrency}
              onChange={(e) => setForm((prev) => ({ ...prev, fromCurrency: e.target.value }))}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={exchangeLabel}>To currency</label>
            <select
              className={exchangeField}
              value={form.toCurrency}
              onChange={(e) => setForm((prev) => ({ ...prev, toCurrency: e.target.value }))}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={exchangeLabel}>Amount</label>
            <input
              className={exchangeField}
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </div>

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
        {scheduled.length === 0 && <div>No scheduled conversions.</div>}
        {scheduled.map((item) => (
          <div key={item.id} className={flexRowBetween}>
            <div>
              <div>
                {item.fromCurrency} → {item.toCurrency} | {item.amount}
              </div>
              <div>
                execute {new Date(item.executeAt).toLocaleString()} | status {item.status} | attempts {item.attempts}
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
