'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, TableSkeleton, SearchWithClear } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type ScheduledFxConversion } from '../../../../lib';
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
  adminDeleteButton,
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

export function ScheduledConversionsPageClient() {
  const [conversions, setConversions] = useState<ScheduledFxConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(``);
  const qDebounced = useDebouncedValue(query, 400);
  const [status, setStatus] = useState<string>(`all`);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (qDebounced.trim()) params.set(`q`, qDebounced.trim());
    if (status !== `all`) params.set(`status`, status);
    const suffix = params.toString() ? `?${params.toString()}` : ``;
    const response = await fetch(`/api/exchange/scheduled${suffix}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) {
      setConversions([]);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_SCHEDULED_CONVERSIONS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_SCHEDULED_CONVERSIONS));
      return;
    }
    const data = await response.json();
    setConversions(data ?? []);
    setLoading(false);
  }, [qDebounced, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetFilters = useCallback(() => {
    setQuery(``);
    setStatus(`all`);
  }, []);

  async function cancelConversion(conversion: ScheduledFxConversion) {
    const response = await fetch(`/api/exchange/scheduled/${conversion.id}/cancel`, {
      method: `POST`,
      credentials: `include`,
    });
    if (response.ok) {
      await refresh();
    } else {
      toast.error(getLocalToastMessage(localToastKeys.SCHEDULED_CANCEL_FAILED));
    }
  }

  async function executeConversion(conversion: ScheduledFxConversion) {
    const response = await fetch(`/api/exchange/scheduled/${conversion.id}/execute`, {
      method: `POST`,
      credentials: `include`,
    });
    if (response.ok) {
      await refresh();
    } else {
      const message = await response.text();
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.SCHEDULED_EXECUTE_FAILED)));
    }
  }

  function renderStatus(status: string) {
    if (status === `EXECUTED`) {
      return <span className={`${adminStatusBadgeBase} ${adminStatusBadgeActive}`}>{status}</span>;
    }
    if (status === `FAILED` || status === `CANCELLED`) {
      return <span className={`${adminStatusBadgeBase} ${adminStatusBadgeDeleted}`}>{status}</span>;
    }
    return <span className={adminStatusBadgeBase}>{status}</span>;
  }

  if (loading && conversions.length === 0 && !loadError) {
    return (
      <div className={adminPageStack}>
        <div>
          <h1 className={adminPageTitle}>Scheduled FX Conversions</h1>
          <p className={adminPageSubtitle}>Review scheduled conversions and override execution.</p>
        </div>
        <TableSkeleton rows={8} columns={8} />
      </div>
    );
  }

  if (loadError && conversions.length === 0) {
    return (
      <div className={adminPageStack}>
        <div>
          <h1 className={adminPageTitle}>Scheduled FX Conversions</h1>
          <p className={adminPageSubtitle}>Review scheduled conversions and override execution.</p>
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
          <h1 className={adminPageTitle}>Scheduled FX Conversions</h1>
          <p className={adminPageSubtitle}>Review scheduled conversions and override execution.</p>
        </div>
        <button type="button" className={adminPrimaryButton} onClick={() => void refresh()} disabled={loading}>
          {loading ? `Refreshing...` : `Refresh`}
        </button>
      </div>

      <div className={adminActionRow}>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Search</span>
          <SearchWithClear value={query} onChangeAction={setQuery} placeholder="Consumer email, conversion id, pair" />
        </label>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Status</span>
          <select className={adminFormInput} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
        <button type="button" className={adminPrimaryButton} onClick={resetFilters} disabled={loading}>
          Reset filters
        </button>
      </div>

      {conversions.length === 0 ? (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No scheduled conversions</div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
