'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ALL_CURRENCY_CODES } from '@remoola/api-types';

import { formatDateTimeForDisplay } from '../../lib/date-utils';
import { firstOtherCurrency, usePreferredCurrency } from '../../lib/hooks';
import { FormSelect, type FormSelectOption, PaginationBar } from '../ui';
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
  actionButtonPrimary,
  actionButtonDanger,
  buttonSecondary,
} = styles;

const ENABLED_OPTIONS: FormSelectOption[] = [
  { value: `yes`, label: `Yes` },
  { value: `no`, label: `No` },
];

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
  fromCurrency: ALL_CURRENCY_CODES[0],
  toCurrency: ALL_CURRENCY_CODES[1],
  targetBalance: `0`,
  maxConvertAmount: ``,
  minIntervalMinutes: `60`,
  enabled: true,
};

export function ExchangeRulesPageClient() {
  const { preferredCurrency, loaded: settingsLoaded } = usePreferredCurrency();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [currencies, setCurrencies] = useState<string[]>([...ALL_CURRENCY_CODES]);
  const preferredAppliedRef = useRef(false);

  const heading = useMemo(() => (editingId ? `Edit Auto-Conversion Rule` : `Create Auto-Conversion Rule`), [editingId]);

  const loadRules = useCallback(async () => {
    setLoadingList(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`/api/exchange/rules?${params}`, { credentials: `include`, cache: `no-store` });
    setLoadingList(false);
    if (!res.ok) return;
    const data = await res.json();
    setRules(data.items ?? []);
    setTotal(Number(data?.total ?? 0));
  }, [page, pageSize]);

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

  useEffect(() => {
    if (!settingsLoaded || !currencies.length || editingId !== null || preferredAppliedRef.current) return;
    if (!preferredCurrency || !currencies.includes(preferredCurrency)) return;
    preferredAppliedRef.current = true;
    setForm((prev) => ({
      ...prev,
      fromCurrency: preferredCurrency,
      toCurrency: firstOtherCurrency(currencies, preferredCurrency),
    }));
  }, [settingsLoaded, currencies, preferredCurrency, editingId]);

  function resetForm() {
    preferredAppliedRef.current = false;
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
        toast.error(message || `Failed to save rule`);
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
      toast.error(`Failed to update rule`);
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
      toast.error(`Failed to delete rule`);
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
          <FormSelect
            label="From currency"
            value={form.fromCurrency}
            onChange={(v) => setForm((prev) => ({ ...prev, fromCurrency: v }))}
            options={currencies.map((c) => ({ value: c, label: c })) as FormSelectOption[]}
            placeholder="Select currency..."
            isClearable={false}
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

          <FormSelect
            label="Enabled"
            value={form.enabled ? `yes` : `no`}
            onChange={(v) => setForm((prev) => ({ ...prev, enabled: v === `yes` }))}
            options={ENABLED_OPTIONS}
            placeholder="Enabled"
            isClearable={false}
          />

          <button onClick={submit} disabled={loading} className={exchangeButton}>
            {editingId ? `Update rule` : `Create rule`}
          </button>
        </div>
      </div>

      <div className={`${exchangeCard} ${gridGap4}`}>
        <strong>Existing rules</strong>
        {total > 0 && (
          <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} loading={loadingList} />
        )}
        {rules.length === 0 && !loadingList && <div>No rules yet.</div>}
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
