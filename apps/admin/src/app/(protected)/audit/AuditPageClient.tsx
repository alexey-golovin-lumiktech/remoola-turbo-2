'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ADMIN_TYPE } from '@remoola/api-types';

import { DataTable, SearchWithClear, TableSkeleton } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { useAuth, useAuditAuth, useAuditActions } from '../../../lib/client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

import type { AuthAuditItem, ActionAuditItem } from '../../../lib/types';

const {
  adminPageStack,
  adminHeaderRow,
  adminPageTitle,
  adminPageSubtitle,
  adminActionRow,
  adminPrimaryButton,
  adminCard,
  adminCardContent,
  adminFilterRow,
  adminFilterLine1Actions,
  adminFormLabelBlock,
  adminFormLabelText,
  adminFormInput,
  adminPaginationBar,
  adminPaginationInfo,
  adminPaginationButton,
  adminMonoCode,
  adminTextGray600,
  adminTextGray700,
  adminTextGray500,
} = styles;

const PAGE_SIZE = 20;
const ACTION_OPTIONS = [
  `payment_refund`,
  `payment_chargeback`,
  `admin_password_change`,
  `admin_delete`,
  `admin_restore`,
  `consumer_verification_update`,
  `exchange_rate_create`,
  `exchange_rate_update`,
  `exchange_rate_delete`,
  `exchange_rule_run`,
  `exchange_scheduled_cancel`,
  `exchange_scheduled_execute`,
];

export function AuditPageClient() {
  const router = useRouter();
  const { data: me, error: authError, isLoading: authLoading } = useAuth();

  const [tab, setTab] = useState<`auth` | `actions`>(`auth`);
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState(``);
  const [dateFrom, setDateFrom] = useState(``);
  const [dateTo, setDateTo] = useState(``);
  const [actionFilter, setActionFilter] = useState(``);

  useEffect(() => {
    if (authLoading) return;
    if (authError || !me) {
      router.push(`/login`);
      return;
    }
    if (me.type !== ADMIN_TYPE.SUPER) {
      router.push(`/dashboard`);
      return;
    }
  }, [me, authError, authLoading, router]);

  const authFilters = {
    page,
    pageSize: PAGE_SIZE,
    ...(email.trim() && { email: email.trim() }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const actionFilters = {
    page,
    pageSize: PAGE_SIZE,
    ...(email.trim() && { email: email.trim() }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(actionFilter && { action: actionFilter }),
  };

  const {
    data: authData,
    error: authDataError,
    isLoading: authLoadingData,
    mutate: mutateAuth,
  } = useAuditAuth(tab === `auth` ? authFilters : undefined);
  const {
    data: actionsData,
    error: actionsDataError,
    isLoading: actionsLoadingData,
    mutate: mutateActions,
  } = useAuditActions(tab === `actions` ? actionFilters : undefined);

  const loadingData = tab === `auth` ? authLoadingData : actionsLoadingData;

  const refresh = useCallback(() => {
    if (tab === `auth`) void mutateAuth();
    else void mutateActions();
  }, [tab, mutateAuth, mutateActions]);

  useEffect(() => {
    if (tab === `auth` && authDataError) {
      toast.error(getErrorMessageForUser(authDataError.message, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)));
    }
  }, [tab, authDataError]);

  useEffect(() => {
    if (tab === `actions` && actionsDataError) {
      toast.error(
        getErrorMessageForUser(actionsDataError.message, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)),
      );
    }
  }, [tab, actionsDataError]);

  const resetFilters = useCallback(() => {
    setEmail(``);
    setDateFrom(``);
    setDateTo(``);
    setActionFilter(``);
    setPage(1);
  }, []);

  const authColumns = [
    {
      key: `id`,
      header: `ID`,
      render: (r: AuthAuditItem) => <span className={adminMonoCode}>{r.id.slice(0, 8)}…</span>,
    },
    {
      key: `createdAt`,
      header: `Date`,
      render: (r: AuthAuditItem) => <span className={adminTextGray600}>{new Date(r.createdAt).toLocaleString()}</span>,
    },
    {
      key: `email`,
      header: `Email`,
      render: (r: AuthAuditItem) => <span className={adminTextGray700}>{r.email}</span>,
    },
    {
      key: `event`,
      header: `Event`,
      render: (r: AuthAuditItem) => <span className={adminTextGray700}>{r.event}</span>,
    },
    {
      key: `ipAddress`,
      header: `IP`,
      render: (r: AuthAuditItem) => <span className={adminTextGray600}>{r.ipAddress ?? `—`}</span>,
    },
    {
      key: `userAgent`,
      header: `User Agent`,
      render: (r: AuthAuditItem) => <span className={adminTextGray600}>{(r.userAgent ?? `—`).slice(0, 60)}</span>,
    },
  ];

  const actionColumns = [
    {
      key: `id`,
      header: `ID`,
      render: (r: ActionAuditItem) => <span className={adminMonoCode}>{r.id.slice(0, 8)}…</span>,
    },
    {
      key: `createdAt`,
      header: `Date`,
      render: (r: ActionAuditItem) => (
        <span className={adminTextGray600}>{new Date(r.createdAt).toLocaleString()}</span>
      ),
    },
    {
      key: `adminEmail`,
      header: `Admin`,
      render: (r: ActionAuditItem) => <span className={adminTextGray700}>{r.adminEmail ?? r.adminId}</span>,
    },
    {
      key: `action`,
      header: `Action`,
      render: (r: ActionAuditItem) => <span className={adminTextGray700}>{r.action}</span>,
    },
    {
      key: `resource`,
      header: `Resource`,
      render: (r: ActionAuditItem) => <span className={adminTextGray700}>{r.resource}</span>,
    },
    {
      key: `resourceId`,
      header: `Resource ID`,
      render: (r: ActionAuditItem) => <span className={adminTextGray600}>{r.resourceId ?? `—`}</span>,
    },
    {
      key: `ipAddress`,
      header: `IP`,
      render: (r: ActionAuditItem) => <span className={adminTextGray600}>{r.ipAddress ?? `—`}</span>,
    },
  ];

  const total = tab === `auth` ? (authData?.total ?? 0) : (actionsData?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const items = tab === `auth` ? (authData?.items ?? []) : (actionsData?.items ?? []);

  if (authLoading || !me) {
    return (
      <div className={adminPageStack}>
        <div>
          <h1 className={adminPageTitle}>Audit</h1>
          <p className={adminPageSubtitle}>Auth log (login/logout) and admin action log. SUPER only.</p>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className={adminPageStack}>
      <div className={adminHeaderRow}>
        <div>
          <h1 className={adminPageTitle}>Audit</h1>
          <p className={adminPageSubtitle}>Auth log (login/logout) and admin action log. SUPER only.</p>
        </div>
        <div className={adminActionRow}>
          <button type="button" className={adminPrimaryButton} onClick={refresh} disabled={loadingData}>
            {loadingData ? `Refreshing...` : `Refresh`}
          </button>
        </div>
      </div>

      <div className={adminCard}>
        <div className={adminCardContent}>
          <div className={adminFilterRow}>
            <label className={adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={adminFormLabelText}>Search</span>
              <SearchWithClear
                value={email}
                onChangeAction={(v) => {
                  setEmail(v);
                  setPage(1);
                }}
                placeholder="Email, event"
              />
            </label>
            <label className={adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={adminFormLabelText}>From</span>
              <input
                type="datetime-local"
                className={adminFormInput}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className={adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={adminFormLabelText}>To</span>
              <input
                type="datetime-local"
                className={adminFormInput}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            {tab === `actions` && (
              <label className={adminFormLabelBlock} style={{ marginBottom: 0 }}>
                <span className={adminFormLabelText}>Action</span>
                <select
                  className={adminFormInput}
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a.replace(/_/g, ` `)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={adminFilterLine1Actions}>
              <button
                type="button"
                className={tab === `auth` ? adminPrimaryButton : styles.adminTopbarTheme}
                onClick={() => {
                  setTab(`auth`);
                  setPage(1);
                }}
              >
                Auth log
              </button>
              <button
                type="button"
                className={tab === `actions` ? adminPrimaryButton : styles.adminTopbarTheme}
                onClick={() => {
                  setTab(`actions`);
                  setPage(1);
                }}
              >
                Actions
              </button>
              <button type="button" className={adminPrimaryButton} onClick={resetFilters} disabled={loadingData}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className={adminPaginationBar}>
          <span className={adminPaginationInfo}>
            Showing {from}–{to} of {total}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={page <= 1 || loadingData}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={adminPaginationInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={page >= totalPages || loadingData}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {!loadingData && total === 0 && (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No audit entries</div>
          </div>
        </div>
      )}

      {total > 0 && tab === `auth` && (
        <DataTable<AuthAuditItem> rows={items as AuthAuditItem[]} columns={authColumns} getRowKeyAction={(r) => r.id} />
      )}
      {total > 0 && tab === `actions` && (
        <DataTable<ActionAuditItem>
          rows={items as ActionAuditItem[]}
          columns={actionColumns}
          getRowKeyAction={(r) => r.id}
        />
      )}
    </div>
  );
}
