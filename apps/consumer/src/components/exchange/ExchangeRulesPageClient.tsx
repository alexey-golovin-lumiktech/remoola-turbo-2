'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatDateTimeForDisplay } from '../../lib/date-utils';
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
  actionButtonPrimary,
  actionButtonDanger,
  buttonSecondary,
} = styles;

const CURRENCIES = [`USD`, `EUR`, `JPY`, `GBP`, `AUD`] as const;

type Rule = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetBalance: number;
  maxConvertAmount?: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
};

type RuleForm = {
  fromCurrency: string;
  toCurrency: string;
  targetBalance: string;
  maxConvertAmount: string;
  minIntervalMinutes: string;
  enabled: boolean;
};

const defaultForm: RuleForm = {
  fromCurrency: `USD`,
  toCurrency: `EUR`,
  targetBalance: `0`,
  maxConvertAmount: ``,
  minIntervalMinutes: `60`,
  enabled: true,
};

export function ExchangeRulesPageClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([...CURRENCIES]);

  const heading = useMemo(() => (editingId ? `Edit Auto-Conversion Rule` : `Create Auto-Conversion Rule`), [editingId]);

  const loadRules = useCallback(async () => {
    const res = await fetch(`/api/exchange/rules`, { credentials: `include`, cache: `no-store` });
    if (!res.ok) return;
    const data = await res.json();
    setRules(data);
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

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

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setForm({
      fromCurrency: rule.fromCurrency,
      toCurrency: rule.toCurrency,
      targetBalance: String(rule.targetBalance),
      maxConvertAmount: rule.maxConvertAmount != null ? String(rule.maxConvertAmount) : ``,
      minIntervalMinutes: String(rule.minIntervalMinutes),
      enabled: rule.enabled,
    });
  }

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        from: form.fromCurrency,
        to: form.toCurrency,
        targetBalance: Number(form.targetBalance),
        maxConvertAmount: form.maxConvertAmount ? Number(form.maxConvertAmount) : null,
        minIntervalMinutes: Number(form.minIntervalMinutes),
        enabled: form.enabled,
      };

      const res = await fetch(`/api/exchange/rules${editingId ? `/${editingId}` : ``}`, {
        method: editingId ? `PATCH` : `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        alert(message || `Failed to save rule`);
        return;
      }

      await loadRules();
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function toggleRule(rule: Rule) {
    const res = await fetch(`/api/exchange/rules/${rule.id}`, {
      method: `PATCH`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });

    if (!res.ok) {
      alert(`Failed to update rule`);
      return;
    }

    await loadRules();
  }

  async function deleteRule(rule: Rule) {
    if (!confirm(`Delete this rule?`)) return;
    const res = await fetch(`/api/exchange/rules/${rule.id}`, {
      method: `DELETE`,
      credentials: `include`,
    });
    if (!res.ok) {
      alert(`Failed to delete rule`);
      return;
    }
    await loadRules();
    if (editingId === rule.id) resetForm();
  }

  return (
    <div className={exchangePageContainer}>
      <h1 className={exchangePageTitle}>Auto-Conversion Rules</h1>

      <div className={`${exchangeCard} ${gridGap4}`}>
        <div className={flexRowBetween}>
          <div>
            <strong>{heading}</strong>
          </div>
          {editingId && (
            <button className={buttonSecondary} onClick={resetForm} type="button">
              Cancel edit
            </button>
          )}
        </div>

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
            <label className={exchangeLabel}>Target balance</label>
            <input
              className={exchangeField}
              type="number"
              min="0"
              step="0.01"
              value={form.targetBalance}
              onChange={(e) => setForm((prev) => ({ ...prev, targetBalance: e.target.value }))}
            />
          </div>

          <div>
            <label className={exchangeLabel}>Max convert amount (optional)</label>
            <input
              className={exchangeField}
              type="number"
              min="0.01"
              step="0.01"
              value={form.maxConvertAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, maxConvertAmount: e.target.value }))}
            />
          </div>

          <div>
            <label className={exchangeLabel}>Min interval (minutes)</label>
            <input
              className={exchangeField}
              type="number"
              min="1"
              step="1"
              value={form.minIntervalMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, minIntervalMinutes: e.target.value }))}
            />
          </div>

          <div>
            <label className={exchangeLabel}>Enabled</label>
            <select
              className={exchangeField}
              value={form.enabled ? `yes` : `no`}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.value === `yes` }))}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <button onClick={submit} disabled={loading} className={exchangeButton}>
            {editingId ? `Update rule` : `Create rule`}
          </button>
        </div>
      </div>

      <div className={`${exchangeCard} ${gridGap4}`}>
        <strong>Existing rules</strong>
        {rules.length === 0 && <div>No rules yet.</div>}
        {rules.map((rule) => (
          <div key={rule.id} className={flexRowBetween}>
            <div>
              <div>
                {rule.fromCurrency} → {rule.toCurrency} | target {rule.targetBalance}
              </div>
              <div>
                max {rule.maxConvertAmount ?? `—`} | every {rule.minIntervalMinutes} min
              </div>
              <div>
                next: {rule.nextRunAt ? formatDateTimeForDisplay(rule.nextRunAt) : `—`} | last:{` `}
                {rule.lastRunAt ? formatDateTimeForDisplay(rule.lastRunAt) : `—`}
              </div>
            </div>
            <div className={gridGap4}>
              <button className={actionButtonPrimary} onClick={() => startEdit(rule)} type="button">
                Edit
              </button>
              <button className={actionButtonPrimary} onClick={() => toggleRule(rule)} type="button">
                {rule.enabled ? `Disable` : `Enable`}
              </button>
              <button className={actionButtonDanger} onClick={() => deleteRule(rule)} type="button">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
