'use client';

import { useCallback, useEffect, useState } from 'react';

import { DataTable } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type AutoConversionRule } from '../../../../lib';

const {
  adminPageStack,
  adminPageTitle,
  adminPageSubtitle,
  adminMonoCode,
  adminTextGray700,
  adminTextGray600,
  adminActionButton,
  adminStatusBadgeBase,
  adminStatusBadgeActive,
  adminStatusBadgeDeleted,
  adminActionRow,
  adminFormLabelBlock,
  adminFormLabelText,
  adminFormInput,
} = styles;

export function ExchangeRulesPageClient() {
  const [rules, setRules] = useState<AutoConversionRule[]>([]);
  const [query, setQuery] = useState(``);
  const [status, setStatus] = useState<`all` | `enabled` | `disabled`>(`all`);

  async function loadRules() {
    const response = await fetch(`/api/exchange/rules`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) return [];
    return await response.json();
  }

  const refresh = useCallback(async () => {
    const data = await loadRules();
    setRules(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleRule(rule: AutoConversionRule) {
    const response = await fetch(`/api/exchange/rules/${rule.id}`, {
      method: `PATCH`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    if (response.ok) {
      await refresh();
    } else {
      alert(`Failed to update rule`);
    }
  }

  async function runRuleNow(rule: AutoConversionRule) {
    const response = await fetch(`/api/exchange/rules/${rule.id}/run`, {
      method: `POST`,
      credentials: `include`,
    });

    if (!response.ok) {
      const message = await response.text();
      alert(message || `Failed to run rule`);
      return;
    }

    const payload = await response.json();
    if (payload?.converted === false) {
      alert(`Rule executed but no conversion: ${payload.reason ?? `no_change`}`);
    }
    await refresh();
  }

  function renderStatus(enabled: boolean) {
    const cls = enabled ? adminStatusBadgeActive : adminStatusBadgeDeleted;
    return <span className={`${adminStatusBadgeBase} ${cls}`}>{enabled ? `ENABLED` : `DISABLED`}</span>;
  }

  const filteredRules = rules.filter((rule) => {
    if (status === `enabled` && !rule.enabled) return false;
    if (status === `disabled` && rule.enabled) return false;

    if (!query.trim()) return true;
    const target = [rule.id, rule.consumer?.email, rule.consumerId, rule.fromCurrency, rule.toCurrency]
      .filter(Boolean)
      .join(` `)
      .toLowerCase();
    return target.includes(query.trim().toLowerCase());
  });

  return (
    <div className={adminPageStack}>
      <div>
        <h1 className={adminPageTitle}>Exchange Rules</h1>
        <p className={adminPageSubtitle}>Review and override customer auto-conversion rules.</p>
      </div>

      <div className={adminActionRow}>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Search</span>
          <input
            className={adminFormInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Consumer email, rule id, pair"
          />
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Status</span>
          <select
            className={adminFormInput}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">All</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
      </div>

      <DataTable<AutoConversionRule>
        rows={filteredRules}
        getRowKeyAction={(r) => r.id}
        columns={[
          {
            key: `id`,
            header: `ID`,
            render: (r) => <span className={adminMonoCode}>{r.id.slice(0, 8)}…</span>,
          },
          {
            key: `consumer`,
            header: `Consumer`,
            render: (r) => (
              <span className={adminTextGray700}>{r.consumer?.email ?? r.consumerId.slice(0, 8) + `…`}</span>
            ),
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
            key: `target`,
            header: `Target`,
            render: (r) => <span className={adminTextGray700}>{r.targetBalance}</span>,
          },
          {
            key: `max`,
            header: `Max`,
            render: (r) => <span className={adminTextGray700}>{r.maxConvertAmount ?? `—`}</span>,
          },
          {
            key: `interval`,
            header: `Interval`,
            render: (r) => <span className={adminTextGray700}>{r.minIntervalMinutes}m</span>,
          },
          {
            key: `status`,
            header: `Status`,
            render: (r) => renderStatus(r.enabled),
          },
          {
            key: `nextRun`,
            header: `Next Run`,
            render: (r) => (
              <span className={adminTextGray600}>{r.nextRunAt ? new Date(r.nextRunAt).toLocaleString() : `—`}</span>
            ),
          },
          {
            key: `actions`,
            header: `Actions`,
            render: (r) => (
              <div className={adminActionRow}>
                <button className={adminActionButton} onClick={() => runRuleNow(r)} type="button">
                  Run now
                </button>
                <button className={adminActionButton} onClick={() => toggleRule(r)} type="button">
                  {r.enabled ? `Disable` : `Enable`}
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
