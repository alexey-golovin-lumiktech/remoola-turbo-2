'use client';

import { useCallback, useEffect, useState } from 'react';

import { DataTable } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type ScheduledFxConversion } from '../../../../lib';

const {
  adminPageStack,
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
} = styles;

export function ScheduledConversionsPageClient() {
  const [conversions, setConversions] = useState<ScheduledFxConversion[]>([]);
  const [query, setQuery] = useState(``);
  const [status, setStatus] = useState<string>(`all`);

  const loadConversions = useCallback(async () => {
    const response = await fetch(`/api/exchange/scheduled`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) return [];
    return await response.json();
  }, []);

  const refresh = useCallback(async () => {
    const data = await loadConversions();
    setConversions(data);
  }, [loadConversions]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function cancelConversion(conversion: ScheduledFxConversion) {
    const response = await fetch(`/api/exchange/scheduled/${conversion.id}/cancel`, {
      method: `POST`,
      credentials: `include`,
    });
    if (response.ok) {
      await refresh();
    } else {
      alert(`Failed to cancel conversion`);
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
      alert(message || `Failed to execute conversion`);
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

  const filteredConversions = conversions.filter((conversion) => {
    if (status !== `all` && conversion.status !== status) return false;
    if (!query.trim()) return true;
    const target = [
      conversion.id,
      conversion.consumer?.email,
      conversion.consumerId,
      conversion.fromCurrency,
      conversion.toCurrency,
      conversion.ledgerId,
    ]
      .filter(Boolean)
      .join(` `)
      .toLowerCase();
    return target.includes(query.trim().toLowerCase());
  });

  return (
    <div className={adminPageStack}>
      <div>
        <h1 className={adminPageTitle}>Scheduled FX Conversions</h1>
        <p className={adminPageSubtitle}>Review scheduled conversions and override execution.</p>
      </div>

      <div className={adminActionRow}>
        <label className={adminFormLabelBlock}>
          <span className={adminFormLabelText}>Search</span>
          <input
            className={adminFormInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Consumer email, conversion id, pair"
          />
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
      </div>

      <DataTable<ScheduledFxConversion>
        rows={filteredConversions}
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
    </div>
  );
}
