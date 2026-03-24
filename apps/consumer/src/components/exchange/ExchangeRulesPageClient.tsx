'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CURRENCY_CODE, CURRENCY_CODES, toCurrencyOrDefault, type TCurrencyCode } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { formatDateTimeForDisplay } from '../../lib/date-utils';
import { usePreferredCurrency } from '../../lib/hooks';
import { PaginationBar } from '../ui';
import { ExchangeRuleModal } from './ExchangeRuleModal';
import localStyles from './ExchangeRulesPageClient.module.css';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const { contactsAddButton, filterRowControlHeight } = styles;

type Rule = {
  id: string;
  fromCurrency: TCurrencyCode;
  toCurrency: TCurrencyCode;
  targetBalance: number;
  maxConvertAmount?: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
};

type RuleForm = {
  fromCurrency: TCurrencyCode;
  toCurrency: TCurrencyCode;
  targetBalance: string;
  maxConvertAmount: string;
  minIntervalMinutes: string;
  enabled: boolean;
};

const defaultForm: RuleForm = {
  fromCurrency: CURRENCY_CODE.USD,
  toCurrency: CURRENCY_CODE.EUR,
  targetBalance: `0`,
  maxConvertAmount: ``,
  minIntervalMinutes: `60`,
  enabled: true,
};

export function ExchangeRulesPageClient() {
  const { preferredCurrency, loaded: settingsLoaded } = usePreferredCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [currencies, setCurrencies] = useState([...CURRENCY_CODES]);
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
      toCurrency: toCurrencyOrDefault(preferredCurrency, CURRENCY_CODE.USD),
    }));
  }, [settingsLoaded, currencies, preferredCurrency, editingId]);

  function resetForm() {
    preferredAppliedRef.current = false;
    setForm(defaultForm);
    setEditingId(null);
    setModalOpen(false);
  }

  function openCreateModal() {
    preferredAppliedRef.current = false;
    setForm(defaultForm);
    setEditingId(null);
    setModalOpen(true);
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
    setModalOpen(true);
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
    <div className={localStyles.pageRoot}>
      <div className={localStyles.toolbar}>
        <button
          type="button"
          onClick={openCreateModal}
          className={cn(contactsAddButton, filterRowControlHeight, localStyles.createButton)}
        >
          Create rule
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

      {rules.length === 0 && !loadingList && <div className={localStyles.emptyState}>No rules yet.</div>}

      <div className={localStyles.rulesList}>
        {rules.map((rule) => (
          <article key={rule.id} className={localStyles.ruleRow}>
            <div className={localStyles.ruleHeader}>
              <div className={localStyles.ruleIdentity}>
                <div className={localStyles.rulePrimary}>
                  {rule.fromCurrency} → {rule.toCurrency}
                </div>
                <div className={localStyles.ruleStatusWrap}>
                  <span className={localStyles.ruleStatusLabel}>Status</span>
                  <span className={rule.enabled ? localStyles.ruleStatusActive : localStyles.ruleStatusPaused}>
                    {rule.enabled ? `Enabled` : `Disabled`}
                  </span>
                </div>
              </div>
            </div>

            <div className={localStyles.ruleMetaGrid}>
              <div className={localStyles.ruleMetaRow}>
                <span className={localStyles.ruleMetaLabel}>Target</span>
                <span className={localStyles.ruleMetaValue}>{rule.targetBalance}</span>
              </div>
              <div className={localStyles.ruleMetaRow}>
                <span className={localStyles.ruleMetaLabel}>Max convert</span>
                <span className={localStyles.ruleMetaValue}>{rule.maxConvertAmount ?? `—`}</span>
              </div>
              <div className={localStyles.ruleMetaRow}>
                <span className={localStyles.ruleMetaLabel}>Interval</span>
                <span className={localStyles.ruleMetaValue}>Every {rule.minIntervalMinutes} min</span>
              </div>
              <div className={localStyles.ruleMetaRow}>
                <span className={localStyles.ruleMetaLabel}>Next run</span>
                <span className={localStyles.ruleMetaValue}>
                  {rule.nextRunAt ? formatDateTimeForDisplay(rule.nextRunAt) : `—`}
                </span>
              </div>
              <div className={localStyles.ruleMetaRow}>
                <span className={localStyles.ruleMetaLabel}>Last run</span>
                <span className={localStyles.ruleMetaValue}>
                  {rule.lastRunAt ? formatDateTimeForDisplay(rule.lastRunAt) : `—`}
                </span>
              </div>
            </div>

            <div className={localStyles.ruleActions}>
              <button className={localStyles.ruleActionPrimary} onClick={() => startEdit(rule)} type="button">
                Edit
              </button>
              <button className={localStyles.ruleActionPrimary} onClick={() => toggleRule(rule)} type="button">
                {rule.enabled ? `Disable` : `Enable`}
              </button>
              <button className={localStyles.ruleActionDanger} onClick={() => deleteRule(rule)} type="button">
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <ExchangeRuleModal
        open={modalOpen}
        heading={heading}
        submitLabel={editingId ? `Update rule` : `Create rule`}
        loading={loading}
        currencies={currencies}
        form={form}
        onCloseAction={resetForm}
        onSubmitAction={submit}
        onFromCurrencyChange={(value) => setForm((prev) => ({ ...prev, fromCurrency: value }))}
        onToCurrencyChange={(value) => setForm((prev) => ({ ...prev, toCurrency: value }))}
        onTargetBalanceChange={(value) => setForm((prev) => ({ ...prev, targetBalance: value }))}
        onMaxConvertAmountChange={(value) => setForm((prev) => ({ ...prev, maxConvertAmount: value }))}
        onMinIntervalMinutesChange={(value) => setForm((prev) => ({ ...prev, minIntervalMinutes: value }))}
        onEnabledChange={(value) => setForm((prev) => ({ ...prev, enabled: value }))}
      />
    </div>
  );
}
