'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DataTable } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { exchangeRateSchema, useFormValidation, type ExchangeRate, type ExchangeRateForm } from '../../../../lib';

const {
  adminPageStack,
  adminPageTitle,
  adminPageSubtitle,
  adminMonoCode,
  adminTextGray700,
  adminTextGray600,
  adminActionButton,
  adminDeleteButton,
  adminActionRow,
  adminFormLabelBlock,
  adminFormLabelText,
  adminFormInput,
  adminFormError,
  adminModalOverlay,
  adminModalCard,
  adminModalHeader,
  adminModalTitle,
  adminModalSubtitle,
  adminModalClose,
  adminModalBody,
  adminModalFooter,
  adminModalCancel,
  adminModalPrimary,
} = styles;

export function ExchangeRatesPageClient() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [query, setQuery] = useState(``);
  const [filterFrom, setFilterFrom] = useState<string>(`all`);
  const [filterTo, setFilterTo] = useState<string>(`all`);
  const [filterStatus, setFilterStatus] = useState<string>(`all`);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const createForm = useFormValidation<ExchangeRateForm>(exchangeRateSchema, {
    fromCurrency: ``,
    toCurrency: ``,
    rate: ``,
    rateBid: ``,
    rateAsk: ``,
    spreadBps: ``,
    status: `APPROVED`,
    effectiveAt: ``,
    expiresAt: ``,
    fetchedAt: ``,
    provider: ``,
    providerRateId: ``,
    confidence: ``,
  });

  const editForm = useFormValidation<ExchangeRateForm>(exchangeRateSchema, {
    fromCurrency: ``,
    toCurrency: ``,
    rate: ``,
    rateBid: ``,
    rateAsk: ``,
    spreadBps: ``,
    status: `APPROVED`,
    effectiveAt: ``,
    expiresAt: ``,
    fetchedAt: ``,
    provider: ``,
    providerRateId: ``,
    confidence: ``,
  });

  const loadRates = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterFrom !== `all`) params.set(`from`, filterFrom);
    if (filterTo !== `all`) params.set(`to`, filterTo);
    if (filterStatus !== `all`) params.set(`status`, filterStatus);
    if (includeHistory) params.set(`includeHistory`, `true`);
    if (includeExpired) params.set(`includeExpired`, `true`);
    const suffix = params.toString() ? `?${params.toString()}` : ``;
    const response = await fetch(`/api/exchange/rates${suffix}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) return [];
    return await response.json();
  }, [filterFrom, filterTo, filterStatus, includeHistory, includeExpired]);

  async function loadCurrencies() {
    const response = await fetch(`/api/exchange/currencies`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) return [];
    return await response.json();
  }

  const refresh = useCallback(async () => {
    const data = await loadRates();
    setRates(data);
  }, [loadRates]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void loadCurrencies().then((data) => setCurrencies(Array.isArray(data) ? data : []));
  }, []);

  function toDateTimeLocal(value?: string | null) {
    if (!value) return ``;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return ``;
    return date.toISOString().slice(0, 16);
  }

  function parseOptionalNumber(value?: string) {
    if (!value || !value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function parseOptionalDate(value?: string) {
    if (!value || !value.trim()) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  const filteredRates = useMemo(() => {
    return rates.filter((rate) => {
      if (filterFrom !== `all` && rate.fromCurrency !== filterFrom) return false;
      if (filterTo !== `all` && rate.toCurrency !== filterTo) return false;

      if (!query.trim()) return true;
      const target = [
        rate.id,
        rate.fromCurrency,
        rate.toCurrency,
        rate.rate,
        rate.status,
        rate.provider,
        rate.providerRateId,
      ]
        .filter(Boolean)
        .join(` `)
        .toLowerCase();
      return target.includes(query.trim().toLowerCase());
    });
  }, [rates, query, filterFrom, filterTo]);

  function openCreateModal() {
    createForm.reset();
    setCreateOpen(true);
  }

  function openEditModal(rate: ExchangeRate) {
    editForm.reset();
    editForm.setValue(`fromCurrency`, rate.fromCurrency);
    editForm.setValue(`toCurrency`, rate.toCurrency);
    editForm.setValue(`rate`, String(rate.rate));
    editForm.setValue(`rateBid`, rate.rateBid != null ? String(rate.rateBid) : ``);
    editForm.setValue(`rateAsk`, rate.rateAsk != null ? String(rate.rateAsk) : ``);
    editForm.setValue(`spreadBps`, rate.spreadBps != null ? String(rate.spreadBps) : ``);
    editForm.setValue(`status`, rate.status ?? `APPROVED`);
    editForm.setValue(`effectiveAt`, toDateTimeLocal(rate.effectiveAt));
    editForm.setValue(`expiresAt`, toDateTimeLocal(rate.expiresAt ?? undefined));
    editForm.setValue(`fetchedAt`, toDateTimeLocal(rate.fetchedAt ?? undefined));
    editForm.setValue(`provider`, rate.provider ?? ``);
    editForm.setValue(`providerRateId`, rate.providerRateId ?? ``);
    editForm.setValue(`confidence`, rate.confidence != null ? String(rate.confidence) : ``);
    setEditingRate(rate);
  }

  function closeEditModal() {
    setEditingRate(null);
  }

  async function createRate() {
    const result = createForm.validate();
    if (!result.success) return;
    if (!(`data` in result)) return;
    const data = result.data;
    if (!data) return;

    setIsCreating(true);
    const payload = {
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      rate: Number(data.rate),
      rateBid: parseOptionalNumber(data.rateBid),
      rateAsk: parseOptionalNumber(data.rateAsk),
      spreadBps: parseOptionalNumber(data.spreadBps),
      status: data.status,
      effectiveAt: parseOptionalDate(data.effectiveAt),
      expiresAt: parseOptionalDate(data.expiresAt),
      fetchedAt: parseOptionalDate(data.fetchedAt),
      provider: data.provider?.trim() || undefined,
      providerRateId: data.providerRateId?.trim() || undefined,
      confidence: parseOptionalNumber(data.confidence),
    };

    const response = await fetch(`/api/exchange/rates`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify(payload),
    });

    setIsCreating(false);

    if (!response.ok) {
      const message = await response.text();
      alert(message || `Failed to create exchange rate`);
      return;
    }

    setCreateOpen(false);
    await refresh();
  }

  async function updateRate() {
    if (!editingRate) return;
    const result = editForm.validate();
    if (!result.success) return;
    if (!(`data` in result)) return;
    const data = result.data;
    if (!data) return;

    setIsUpdating(true);
    const payload = {
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      rate: Number(data.rate),
      rateBid: parseOptionalNumber(data.rateBid),
      rateAsk: parseOptionalNumber(data.rateAsk),
      spreadBps: parseOptionalNumber(data.spreadBps),
      status: data.status,
      effectiveAt: parseOptionalDate(data.effectiveAt),
      expiresAt: parseOptionalDate(data.expiresAt),
      fetchedAt: parseOptionalDate(data.fetchedAt),
      provider: data.provider?.trim() || undefined,
      providerRateId: data.providerRateId?.trim() || undefined,
      confidence: parseOptionalNumber(data.confidence),
    };

    const response = await fetch(`/api/exchange/rates/${editingRate.id}`, {
      method: `PATCH`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify(payload),
    });

    setIsUpdating(false);

    if (!response.ok) {
      const message = await response.text();
      alert(message || `Failed to update exchange rate`);
      return;
    }

    setEditingRate(null);
    await refresh();
  }

  async function deleteRate(rate: ExchangeRate) {
    if (!confirm(`Delete ${rate.fromCurrency} → ${rate.toCurrency}?`)) return;
    const response = await fetch(`/api/exchange/rates/${rate.id}`, {
      method: `DELETE`,
      credentials: `include`,
    });
    if (!response.ok) {
      const message = await response.text();
      alert(message || `Failed to delete exchange rate`);
      return;
    }
    await refresh();
  }

  function renderCurrencyInput(
    value: string,
    onChange: (value: string) => void,
    onBlur: () => void,
    disabled: boolean,
    placeholder: string,
  ) {
    if (!currencies.length) {
      return (
        <input
          className={adminFormInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    }

    return (
      <select
        className={adminFormInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
      >
        <option value="">Select currency</option>
        {currencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    );
  }

  function renderRateForm(
    form: typeof createForm,
    disabled: boolean,
    submitLabel: string,
    onSubmit: () => void,
    onCancel: () => void,
  ) {
    return (
      <div className={adminModalOverlay}>
        <div className={adminModalCard}>
          <div className={adminModalHeader}>
            <div>
              <div className={adminModalTitle}>{submitLabel === `Create` ? `Create rate` : `Edit rate`}</div>
              <div className={adminModalSubtitle}>Manage direct exchange rates for conversions.</div>
            </div>
            <button className={adminModalClose} onClick={(e) => (e.stopPropagation(), e.preventDefault(), onCancel())}>
              ✕
            </button>
          </div>

          <div className={adminModalBody}>
            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>From currency</div>
              {renderCurrencyInput(
                form.values.fromCurrency,
                (value) => form.setValue(`fromCurrency`, value),
                () => form.setTouched(`fromCurrency`),
                disabled,
                `USD`,
              )}
              {form.errors.fromCurrency && <div className={adminFormError}>{form.errors.fromCurrency}</div>}
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>To currency</div>
              {renderCurrencyInput(
                form.values.toCurrency,
                (value) => form.setValue(`toCurrency`, value),
                () => form.setTouched(`toCurrency`),
                disabled,
                `EUR`,
              )}
              {form.errors.toCurrency && <div className={adminFormError}>{form.errors.toCurrency}</div>}
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Rate</div>
              <input
                className={adminFormInput}
                value={form.values.rate}
                onChange={(e) => form.setValue(`rate`, e.target.value)}
                onBlur={() => form.setTouched(`rate`)}
                placeholder="1.23456789"
                disabled={disabled}
              />
              {form.errors.rate && <div className={adminFormError}>{form.errors.rate}</div>}
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Bid</div>
              <input
                className={adminFormInput}
                value={form.values.rateBid ?? ``}
                onChange={(e) => form.setValue(`rateBid`, e.target.value)}
                placeholder="Optional"
                disabled={disabled}
              />
              {form.errors.rateBid && <div className={adminFormError}>{form.errors.rateBid}</div>}
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Ask</div>
              <input
                className={adminFormInput}
                value={form.values.rateAsk ?? ``}
                onChange={(e) => form.setValue(`rateAsk`, e.target.value)}
                placeholder="Optional"
                disabled={disabled}
              />
              {form.errors.rateAsk && <div className={adminFormError}>{form.errors.rateAsk}</div>}
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Spread (bps)</div>
              <input
                className={adminFormInput}
                value={form.values.spreadBps ?? ``}
                onChange={(e) => form.setValue(`spreadBps`, e.target.value)}
                placeholder="Optional"
                disabled={disabled}
              />
              {form.errors.spreadBps && <div className={adminFormError}>{form.errors.spreadBps}</div>}
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Status</div>
              <select
                className={adminFormInput}
                value={form.values.status ?? `APPROVED`}
                onChange={(e) => form.setValue(`status`, e.target.value as ExchangeRateForm[`status`])}
                disabled={disabled}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="APPROVED">APPROVED</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Effective at</div>
              <input
                className={adminFormInput}
                type="datetime-local"
                value={form.values.effectiveAt ?? ``}
                onChange={(e) => form.setValue(`effectiveAt`, e.target.value)}
                disabled={disabled}
              />
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Expires at</div>
              <input
                className={adminFormInput}
                type="datetime-local"
                value={form.values.expiresAt ?? ``}
                onChange={(e) => form.setValue(`expiresAt`, e.target.value)}
                disabled={disabled}
              />
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Fetched at</div>
              <input
                className={adminFormInput}
                type="datetime-local"
                value={form.values.fetchedAt ?? ``}
                onChange={(e) => form.setValue(`fetchedAt`, e.target.value)}
                disabled={disabled}
              />
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Provider</div>
              <input
                className={adminFormInput}
                value={form.values.provider ?? ``}
                onChange={(e) => form.setValue(`provider`, e.target.value)}
                placeholder="Optional"
                disabled={disabled}
              />
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Provider rate id</div>
              <input
                className={adminFormInput}
                value={form.values.providerRateId ?? ``}
                onChange={(e) => form.setValue(`providerRateId`, e.target.value)}
                placeholder="Optional"
                disabled={disabled}
              />
            </label>

            <label className={adminFormLabelBlock}>
              <div className={adminFormLabelText}>Confidence</div>
              <input
                className={adminFormInput}
                value={form.values.confidence ?? ``}
                onChange={(e) => form.setValue(`confidence`, e.target.value)}
                placeholder="0-100"
                disabled={disabled}
              />
              {form.errors.confidence && <div className={adminFormError}>{form.errors.confidence}</div>}
            </label>

            <div className={adminModalFooter}>
              <button
                className={adminModalCancel}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), onCancel())}
                disabled={disabled}
              >
                Cancel
              </button>
              <button
                className={adminModalPrimary}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), onSubmit())}
                disabled={disabled}
              >
                {disabled ? `${submitLabel}...` : submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={adminPageStack}>
      <div>
        <h1 className={adminPageTitle}>Exchange Rates</h1>
        <p className={adminPageSubtitle}>Manage direct FX rates used in consumer conversions.</p>
      </div>

      <div className={adminActionRow}>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Search</span>
          <input
            className={adminFormInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pair, rate, id"
          />
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>From</span>
          <select className={adminFormInput} value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}>
            <option value="all">All</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>To</span>
          <select className={adminFormInput} value={filterTo} onChange={(e) => setFilterTo(e.target.value)}>
            <option value="all">All</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Status</span>
          <select className={adminFormInput} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>History</span>
          <input
            className={adminFormInput}
            type="checkbox"
            checked={includeHistory}
            onChange={(e) => setIncludeHistory(e.target.checked)}
          />
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Expired</span>
          <input
            className={adminFormInput}
            type="checkbox"
            checked={includeExpired}
            onChange={(e) => setIncludeExpired(e.target.checked)}
          />
        </label>
        <div className={adminActionRow}>
          <button className={adminActionButton} onClick={openCreateModal} type="button">
            Add rate
          </button>
        </div>
      </div>

      <DataTable<ExchangeRate>
        rows={filteredRates}
        getRowKeyAction={(r) => r.id}
        columns={[
          {
            key: `id`,
            header: `ID`,
            render: (r) => <span className={adminMonoCode}>{r.id.slice(0, 8)}…</span>,
          },
          {
            key: `pair`,
            header: `Pair`,
            render: (r) => (
              <span className={adminTextGray700}>
                {r.fromCurrency} → {r.toCurrency}
              </span>
            ),
          },
          {
            key: `rate`,
            header: `Rate`,
            render: (r) => <span className={adminTextGray700}>{Number(r.rate).toFixed(8)}</span>,
          },
          {
            key: `status`,
            header: `Status`,
            render: (r) => <span className={adminTextGray700}>{r.status ?? `APPROVED`}</span>,
          },
          {
            key: `effective`,
            header: `Effective`,
            render: (r) =>
              r.effectiveAt ? (
                <span className={adminTextGray600}>{new Date(r.effectiveAt).toLocaleString()}</span>
              ) : (
                `—`
              ),
          },
          {
            key: `provider`,
            header: `Provider`,
            render: (r) => <span className={adminTextGray600}>{r.provider ?? `—`}</span>,
          },
          {
            key: `updated`,
            header: `Updated`,
            render: (r) => <span className={adminTextGray600}>{new Date(r.updatedAt).toLocaleString()}</span>,
          },
          {
            key: `actions`,
            header: `Actions`,
            render: (r) => (
              <div className={adminActionRow}>
                <button className={adminActionButton} onClick={() => openEditModal(r)} type="button">
                  Edit
                </button>
                <button className={adminDeleteButton} onClick={() => deleteRate(r)} type="button">
                  Delete
                </button>
              </div>
            ),
          },
        ]}
      />

      {createOpen && renderRateForm(createForm, isCreating, `Create`, createRate, () => setCreateOpen(false))}
      {editingRate && renderRateForm(editForm, isUpdating, `Save`, updateRate, closeEditModal)}
    </div>
  );
}
