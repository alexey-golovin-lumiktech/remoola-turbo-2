'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, TableSkeleton, SearchWithClear } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type AutoConversionRule } from '../../../../lib';
import { useDebouncedValue } from '../../../../lib/client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

const {
  adminPageStack,
  adminHeaderRow,
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
  adminCard,
  adminCardContent,
  adminTextGray500,
  adminPrimaryButton,
} = styles;

export function ExchangeRulesPageClient() {
  const [rules, setRules] = useState<AutoConversionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(``);
  const qDebounced = useDebouncedValue(query, 400);
  const [status, setStatus] = useState<`all` | `enabled` | `disabled`>(`all`);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (qDebounced.trim()) params.set(`q`, qDebounced.trim());
    if (status !== `all`) params.set(`enabled`, status === `enabled` ? `true` : `false`);
    const suffix = params.toString() ? `?${params.toString()}` : ``;
    const response = await fetch(`/api/exchange/rules${suffix}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) {
      setRules([]);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_EXCHANGE_RULES));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_EXCHANGE_RULES));
      return;
    }
    const data = await response.json();
    setRules(data ?? []);
    setLoading(false);
  }, [qDebounced, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetFilters = useCallback(() => {
    setQuery(``);
    setStatus(`all`);
  }, []);

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
      toast.error(getLocalToastMessage(localToastKeys.RULE_UPDATE_FAILED));
    }
  }

  async function runRuleNow(rule: AutoConversionRule) {
    const response = await fetch(`/api/exchange/rules/${rule.id}/run`, {
      method: `POST`,
      credentials: `include`,
    });

    if (!response.ok) {
      const message = await response.text();
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.RULE_RUN_FAILED)));
      return;
    }

    const payload = await response.json();
    if (payload?.converted === false) {
      toast.info(
        `${getLocalToastMessage(localToastKeys.RULE_EXECUTED_NO_CONVERSION)} ${payload.reason ?? `no_change`}`,
      );
    }
    await refresh();
  }

  function renderStatus(enabled: boolean) {
    const cls = enabled ? adminStatusBadgeActive : adminStatusBadgeDeleted;
    return <span className={`${adminStatusBadgeBase} ${cls}`}>{enabled ? `ENABLED` : `DISABLED`}</span>;
  }

  if (loading && rules.length === 0 && !loadError) {
    return (
      <div className={adminPageStack}>
        <div>
          <h1 className={adminPageTitle}>Exchange Rules</h1>
          <p className={adminPageSubtitle}>Review and override customer auto-conversion rules.</p>
        </div>
        <TableSkeleton rows={8} columns={9} />
      </div>
    );
  }

  if (loadError && rules.length === 0) {
    return (
      <div className={adminPageStack}>
        <div>
          <h1 className={adminPageTitle}>Exchange Rules</h1>
          <p className={adminPageSubtitle}>Review and override customer auto-conversion rules.</p>
        </div>
        <div className={adminCard}>
          <div className={adminCardContent}>
            <button type="button" className={adminPrimaryButton} onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={adminPageStack}>
      <div className={adminHeaderRow}>
        <div>
          <h1 className={adminPageTitle}>Exchange Rules</h1>
          <p className={adminPageSubtitle}>Review and override customer auto-conversion rules.</p>
        </div>
        <button type="button" className={adminPrimaryButton} onClick={() => void refresh()} disabled={loading}>
          {loading ? `Refreshing...` : `Refresh`}
        </button>
      </div>

      <div className={adminActionRow}>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Search</span>
          <SearchWithClear value={query} onChangeAction={setQuery} placeholder="Consumer email, rule id, pair" />
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Enabled</span>
          <select
            className={adminFormInput}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">All</option>
            <option value="enabled">Yes</option>
            <option value="disabled">No</option>
          </select>
        </label>
        <button type="button" className={adminPrimaryButton} onClick={resetFilters} disabled={loading}>
          Reset filters
        </button>
      </div>

      {rules.length === 0 ? (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No rules</div>
          </div>
        </div>
      ) : (
        <DataTable<AutoConversionRule>
          rows={rules}
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
                <Link href={`/consumers/${r.consumerId}`} className={adminTextGray700}>
                  {r.consumer?.email ?? r.consumerId.slice(0, 8) + `…`}
                </Link>
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
      )}
    </div>
  );
}
