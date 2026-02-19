'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TAdminExchangeRulesListQuery } from '@remoola/api-types';

import { DataTable, TableSkeleton } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type AutoConversionRule, type PaginatedResponse } from '../../../../lib';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

const {
  adminMonoCode,
  adminTextGray700,
  adminTextGray600,
  adminActionButton,
  adminStatusBadgeBase,
  adminStatusBadgeActive,
  adminStatusBadgeDeleted,
  adminActionRow,
  adminCard,
  adminCardContent,
  adminTextGray500,
  adminPrimaryButton,
  adminPaginationBar,
  adminPaginationInfo,
  adminPaginationButton,
} = styles;

type ExchangeRulesTableBlockProps = {
  page: number;
  pageSize: number;
  onPageChangeAction: (page: number) => void;
  q: string;
  status: string;
  includeDeleted: boolean;
  refreshKey: number;
};

export function ExchangeRulesTableBlock({
  page,
  pageSize,
  onPageChangeAction,
  q,
  status,
  includeDeleted,
}: ExchangeRulesTableBlockProps) {
  const [rules, setRules] = useState<AutoConversionRule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const query = {
      page: String(page),
      pageSize: String(pageSize),
      ...(q.trim() && { q: q.trim() }),
      ...(status !== `all` && { enabled: status === `enabled` ? `true` : `false` }),
      ...(includeDeleted && { includeDeleted: `true` }),
    } as Partial<TAdminExchangeRulesListQuery>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== ``) params.set(key, value);
    }
    const suffix = `?${params.toString()}`;
    const response = await fetch(`/api/exchange/rules${suffix}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) {
      setRules([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_EXCHANGE_RULES));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_EXCHANGE_RULES));
      return;
    }
    const data = (await response.json()) as PaginatedResponse<AutoConversionRule>;
    setRules(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setLoading(false);
  }, [page, pageSize, q, status, includeDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRule = useCallback(
    async (rule: AutoConversionRule) => {
      const response = await fetch(`/api/exchange/rules/${rule.id}`, {
        method: `PATCH`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (response.ok) {
        await load();
      } else {
        toast.error(getLocalToastMessage(localToastKeys.RULE_UPDATE_FAILED));
      }
    },
    [load],
  );

  const runRuleNow = useCallback(
    async (rule: AutoConversionRule) => {
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
      await load();
    },
    [load],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function renderStatus(enabled: boolean) {
    const cls = enabled ? adminStatusBadgeActive : adminStatusBadgeDeleted;
    return <span className={`${adminStatusBadgeBase} ${cls}`}>{enabled ? `ENABLED` : `DISABLED`}</span>;
  }

  if (loading && rules.length === 0 && !loadError) {
    return <TableSkeleton rows={8} columns={9} />;
  }

  if (loadError && rules.length === 0) {
    return (
      <div className={adminCard}>
        <div className={adminCardContent}>
          <button type="button" className={adminPrimaryButton} onClick={() => void load()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {total > 0 && (
        <div className={adminPaginationBar}>
          <span className={adminPaginationInfo}>
            Showing {from}–{to} of {total}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={page <= 1 || loading}
            onClick={() => onPageChangeAction(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span className={adminPaginationInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={page >= totalPages || loading}
            onClick={() => onPageChangeAction(Math.min(totalPages, page + 1))}
          >
            Next
          </button>
        </div>
      )}

      {rules.length === 0 && !loading ? (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No rules</div>
          </div>
        </div>
      ) : rules.length > 0 ? (
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
      ) : null}
    </>
  );
}
