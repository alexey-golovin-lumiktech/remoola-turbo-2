'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TAdminExchangeScheduledListQuery } from '@remoola/api-types';

import { DataTable, TableSkeleton } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaginatedResponse, type ScheduledFxConversion } from '../../../../lib';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

const {
  adminMonoCode,
  adminTextGray700,
  adminTextGray600,
  adminActionButton,
  adminDeleteButton,
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

type ScheduledConversionsTableBlockProps = {
  page: number;
  pageSize: number;
  onPageChangeAction: (page: number) => void;
  q: string;
  status: string;
  includeDeleted: boolean;
  refreshKey: number;
};

export function ScheduledConversionsTableBlock({
  page,
  pageSize,
  onPageChangeAction,
  q,
  status,
  includeDeleted,
}: ScheduledConversionsTableBlockProps) {
  const [conversions, setConversions] = useState<ScheduledFxConversion[]>([]);
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
      ...(status !== `all` && { status }),
      ...(includeDeleted && { includeDeleted: `true` }),
    } as Partial<TAdminExchangeScheduledListQuery>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== ``) params.set(key, value);
    }
    const suffix = `?${params.toString()}`;
    const response = await fetch(`/api/exchange/scheduled${suffix}`, {
      cache: `no-store`,
      credentials: `include`,
    });
    if (!response.ok) {
      setConversions([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_SCHEDULED_CONVERSIONS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_SCHEDULED_CONVERSIONS));
      return;
    }
    const data = (await response.json()) as PaginatedResponse<ScheduledFxConversion>;
    setConversions(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setLoading(false);
  }, [page, pageSize, q, status, includeDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelConversion = useCallback(
    async (conversion: ScheduledFxConversion) => {
      const response = await fetch(`/api/exchange/scheduled/${conversion.id}/cancel`, {
        method: `POST`,
        credentials: `include`,
      });
      if (response.ok) {
        await load();
      } else {
        toast.error(getLocalToastMessage(localToastKeys.SCHEDULED_CANCEL_FAILED));
      }
    },
    [load],
  );

  const executeConversion = useCallback(
    async (conversion: ScheduledFxConversion) => {
      const response = await fetch(`/api/exchange/scheduled/${conversion.id}/execute`, {
        method: `POST`,
        credentials: `include`,
      });
      if (response.ok) {
        await load();
      } else {
        const message = await response.text();
        toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.SCHEDULED_EXECUTE_FAILED)));
      }
    },
    [load],
  );

  function renderStatus(statusVal: string) {
    if (statusVal === `EXECUTED`) {
      return <span className={`${adminStatusBadgeBase} ${adminStatusBadgeActive}`}>{statusVal}</span>;
    }
    if (statusVal === `FAILED` || statusVal === `CANCELLED`) {
      return <span className={`${adminStatusBadgeBase} ${adminStatusBadgeDeleted}`}>{statusVal}</span>;
    }
    return <span className={adminStatusBadgeBase}>{statusVal}</span>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading && conversions.length === 0 && !loadError) {
    return <TableSkeleton rows={8} columns={8} />;
  }

  if (loadError && conversions.length === 0) {
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

      {conversions.length === 0 && !loading ? (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No scheduled conversions</div>
          </div>
        </div>
      ) : conversions.length > 0 ? (
        <DataTable<ScheduledFxConversion>
          rows={conversions}
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
              key: `amount`,
              header: `Amount`,
              render: (r) => <span className={adminTextGray700}>{r.amount}</span>,
            },
            {
              key: `status`,
              header: `Status`,
              render: (r) => renderStatus(r.status),
            },
            {
              key: `execute`,
              header: `Execute At`,
              render: (r) => <span className={adminTextGray600}>{new Date(r.executeAt).toLocaleString()}</span>,
            },
            {
              key: `attempts`,
              header: `Attempts`,
              render: (r) => <span className={adminTextGray600}>{r.attempts}</span>,
            },
            {
              key: `actions`,
              header: `Actions`,
              render: (r) => (
                <div className={adminActionRow}>
                  {(r.status === `PENDING` || r.status === `FAILED`) && (
                    <button className={adminActionButton} onClick={() => executeConversion(r)} type="button">
                      Execute now
                    </button>
                  )}
                  {r.status === `PENDING` && (
                    <button className={adminDeleteButton} onClick={() => cancelConversion(r)} type="button">
                      Cancel
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </>
  );
}
