'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ADMIN_TYPE } from '@remoola/api-types';

import { DataTable, PageSkeleton, SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { useAuth, useAuditAuth, useAuditActions } from '../../../lib/client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

const {
  adminPageStack,
  adminHeaderRow,
  adminPageTitle,
  adminPageSubtitle,
  adminActionRow,
  adminCard,
  adminCardContent,
  adminFilterRow,
  adminFilterLine1Actions,
  adminFormLabelBlock,
  adminFormLabelText,
  adminFormInput,
  adminPrimaryButton,
  adminPaginationButton,
  adminPaginationBar,
  adminPaginationInfo,
  adminTextGray500,
} = styles;

const DEFAULT_PAGE_SIZE = 20;
const TAB_AUTH = `auth` as const;
const TAB_ACTIONS = `actions` as const;
type TabId = typeof TAB_AUTH | typeof TAB_ACTIONS;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: `short`,
      timeStyle: `medium`,
    });
  } catch {
    return iso;
  }
}

function truncate(str: string | null | undefined, maxLen: number): string {
  if (str == null || str === ``) return `—`;
  return str.length <= maxLen ? str : `${str.slice(0, maxLen)}…`;
}

export function AuditPageClient() {
  const router = useRouter();
  const { data: me, error: authError, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>(TAB_AUTH);

  // Auth log filters
  const [authEmail, setAuthEmail] = useState(``);
  const [authDateFrom, setAuthDateFrom] = useState(``);
  const [authDateTo, setAuthDateTo] = useState(``);
  const [authPage, setAuthPage] = useState(1);
  const [authPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Actions filters
  const [actionsAction, setActionsAction] = useState(``);
  const [actionsAdminId, setActionsAdminId] = useState(``);
  const [actionsEmail, setActionsEmail] = useState(``);
  const [actionsDateFrom, setActionsDateFrom] = useState(``);
  const [actionsDateTo, setActionsDateTo] = useState(``);
  const [actionsPage, setActionsPage] = useState(1);
  const [actionsPageSize] = useState(DEFAULT_PAGE_SIZE);

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
    email: authEmail.trim() || undefined,
    dateFrom: authDateFrom.trim() || undefined,
    dateTo: authDateTo.trim() || undefined,
    page: authPage,
    pageSize: authPageSize,
  };

  const actionsFilters = {
    action: actionsAction.trim() || undefined,
    adminId: actionsAdminId.trim() || undefined,
    email: actionsEmail.trim() || undefined,
    dateFrom: actionsDateFrom.trim() || undefined,
    dateTo: actionsDateTo.trim() || undefined,
    page: actionsPage,
    pageSize: actionsPageSize,
  };

  const {
    data: authData,
    error: authErrorData,
    isLoading: authLoadingData,
    isValidating: authValidating,
    mutate: mutateAuth,
  } = useAuditAuth(activeTab === TAB_AUTH ? authFilters : undefined);

  const {
    data: actionsData,
    error: actionsErrorData,
    isLoading: actionsLoadingData,
    isValidating: actionsValidating,
    mutate: mutateActions,
  } = useAuditActions(activeTab === TAB_ACTIONS ? actionsFilters : undefined);

  useEffect(() => {
    if (authErrorData)
      toast.error(getErrorMessageForUser(authErrorData.message, getLocalToastMessage(localToastKeys.LOAD_AUDIT_AUTH)));
  }, [authErrorData]);

  useEffect(() => {
    if (actionsErrorData)
      toast.error(
        getErrorMessageForUser(actionsErrorData.message, getLocalToastMessage(localToastKeys.LOAD_AUDIT_ACTIONS)),
      );
  }, [actionsErrorData]);

  const authTotal = authData?.total ?? 0;
  const authTotalPages = Math.max(1, Math.ceil(authTotal / authPageSize));
  const authFrom = authTotal === 0 ? 0 : (authPage - 1) * authPageSize + 1;
  const authTo = Math.min(authPage * authPageSize, authTotal);

  const actionsTotal = actionsData?.total ?? 0;
  const actionsTotalPages = Math.max(1, Math.ceil(actionsTotal / actionsPageSize));
  const actionsFrom = actionsTotal === 0 ? 0 : (actionsPage - 1) * actionsPageSize + 1;
  const actionsTo = Math.min(actionsPage * actionsPageSize, actionsTotal);

  const isValidating = activeTab === TAB_AUTH ? authValidating : actionsValidating;
  const hasError = activeTab === TAB_AUTH ? !!authErrorData : !!actionsErrorData;

  const handleRefresh = useCallback(() => {
    if (activeTab === TAB_AUTH) void mutateAuth();
    else void mutateActions();
  }, [activeTab, mutateAuth, mutateActions]);

  const resetAuthFilters = useCallback(() => {
    setAuthEmail(``);
    setAuthDateFrom(``);
    setAuthDateTo(``);
    setAuthPage(1);
  }, []);

  const resetActionsFilters = useCallback(() => {
    setActionsAction(``);
    setActionsAdminId(``);
    setActionsEmail(``);
    setActionsDateFrom(``);
    setActionsDateTo(``);
    setActionsPage(1);
  }, []);

  if (authLoading || !me || me.type !== ADMIN_TYPE.SUPER) {
    return <PageSkeleton />;
  }

  return (
    <div className={adminPageStack}>
      <div className={adminHeaderRow}>
        <div>
          <h1 className={adminPageTitle}>Audit</h1>
          <p className={adminPageSubtitle}>Auth log (login/logout/lockout) and admin action audit. SUPER only.</p>
        </div>
        <div className={adminActionRow}>
          <button type="button" className={adminPrimaryButton} onClick={handleRefresh} disabled={isValidating}>
            {isValidating ? `Refreshing…` : `Refresh`}
          </button>
        </div>
      </div>

      <div className={adminCard}>
        <div className={adminCardContent}>
          <div className={adminFilterRow} role="tablist">
            {activeTab === TAB_AUTH && (
              <>
                <label className={adminFormLabelBlock} htmlFor="audit-auth-email">
                  <span className={adminFormLabelText}>Email</span>
                  <SearchWithClear
                    id="audit-auth-email"
                    name="email"
                    value={authEmail}
                    onChangeAction={(v) => {
                      setAuthEmail(v);
                      setAuthPage(1);
                    }}
                    placeholder="Filter by admin email"
                  />
                </label>
                <label className={adminFormLabelBlock} htmlFor="audit-auth-dateFrom">
                  <span className={adminFormLabelText}>From date</span>
                  <input
                    id="audit-auth-dateFrom"
                    type="date"
                    className={adminFormInput}
                    value={authDateFrom}
                    onChange={(e) => {
                      setAuthDateFrom(e.target.value);
                      setAuthPage(1);
                    }}
                  />
                </label>
                <label className={adminFormLabelBlock} htmlFor="audit-auth-dateTo">
                  <span className={adminFormLabelText}>To date</span>
                  <input
                    id="audit-auth-dateTo"
                    type="date"
                    className={adminFormInput}
                    value={authDateTo}
                    onChange={(e) => {
                      setAuthDateTo(e.target.value);
                      setAuthPage(1);
                    }}
                  />
                </label>
              </>
            )}

            {activeTab === TAB_ACTIONS && (
              <>
                <label className={adminFormLabelBlock} htmlFor="audit-actions-action">
                  <span className={adminFormLabelText}>Action</span>
                  <input
                    id="audit-actions-action"
                    type="text"
                    className={adminFormInput}
                    placeholder="e.g. refund"
                    value={actionsAction}
                    onChange={(e) => {
                      setActionsAction(e.target.value);
                      setActionsPage(1);
                    }}
                  />
                </label>
                <label className={adminFormLabelBlock} htmlFor="audit-actions-email">
                  <span className={adminFormLabelText}>Admin email</span>
                  <SearchWithClear
                    id="audit-actions-email"
                    name="email"
                    value={actionsEmail}
                    onChangeAction={(v) => {
                      setActionsEmail(v);
                      setActionsPage(1);
                    }}
                    placeholder="Filter by admin email"
                  />
                </label>
                <label className={adminFormLabelBlock} htmlFor="audit-actions-adminId">
                  <span className={adminFormLabelText}>Admin ID</span>
                  <input
                    id="audit-actions-adminId"
                    type="text"
                    className={adminFormInput}
                    placeholder="UUID"
                    value={actionsAdminId}
                    onChange={(e) => {
                      setActionsAdminId(e.target.value);
                      setActionsPage(1);
                    }}
                  />
                </label>
                <label className={adminFormLabelBlock} htmlFor="audit-actions-dateFrom">
                  <span className={adminFormLabelText}>From date</span>
                  <input
                    id="audit-actions-dateFrom"
                    type="date"
                    className={adminFormInput}
                    value={actionsDateFrom}
                    onChange={(e) => {
                      setActionsDateFrom(e.target.value);
                      setActionsPage(1);
                    }}
                  />
                </label>
                <label className={adminFormLabelBlock} htmlFor="audit-actions-dateTo">
                  <span className={adminFormLabelText}>To date</span>
                  <input
                    id="audit-actions-dateTo"
                    type="date"
                    className={adminFormInput}
                    value={actionsDateTo}
                    onChange={(e) => {
                      setActionsDateTo(e.target.value);
                      setActionsPage(1);
                    }}
                  />
                </label>
              </>
            )}

            <div className={adminFilterLine1Actions}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === TAB_AUTH}
                className={activeTab === TAB_AUTH ? adminPrimaryButton : adminPaginationButton}
                onClick={() => setActiveTab(TAB_AUTH)}
              >
                Auth log
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === TAB_ACTIONS}
                className={activeTab === TAB_ACTIONS ? adminPrimaryButton : adminPaginationButton}
                onClick={() => setActiveTab(TAB_ACTIONS)}
              >
                Actions
              </button>
              {activeTab === TAB_AUTH && (
                <button
                  type="button"
                  className={adminPrimaryButton}
                  onClick={resetAuthFilters}
                  disabled={authValidating}
                >
                  Reset
                </button>
              )}
              {activeTab === TAB_ACTIONS && (
                <button
                  type="button"
                  className={adminPrimaryButton}
                  onClick={resetActionsFilters}
                  disabled={actionsValidating}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {hasError && (
            <div className={adminCardContent}>
              <button
                type="button"
                className={adminPrimaryButton}
                onClick={() => (activeTab === TAB_AUTH ? void mutateAuth() : void mutateActions())}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === TAB_AUTH && authTotal > 0 && (
        <div className={adminPaginationBar}>
          <span className={adminPaginationInfo}>
            Showing {authFrom}–{authTo} of {authTotal}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={authPage <= 1 || authValidating}
            onClick={() => setAuthPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={adminPaginationInfo}>
            Page {authPage} of {authTotalPages}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={authPage >= authTotalPages || authValidating}
            onClick={() => setAuthPage((p) => Math.min(authTotalPages, p + 1))}
          >
            Next
          </button>
          {authValidating && (
            <span className={adminTextGray500} style={{ marginLeft: `0.5rem` }}>
              Updating…
            </span>
          )}
        </div>
      )}

      {activeTab === TAB_ACTIONS && actionsTotal > 0 && (
        <div className={adminPaginationBar}>
          <span className={adminPaginationInfo}>
            Showing {actionsFrom}–{actionsTo} of {actionsTotal}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={actionsPage <= 1 || actionsValidating}
            onClick={() => setActionsPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={adminPaginationInfo}>
            Page {actionsPage} of {actionsTotalPages}
          </span>
          <button
            type="button"
            className={adminPaginationButton}
            disabled={actionsPage >= actionsTotalPages || actionsValidating}
            onClick={() => setActionsPage((p) => Math.min(actionsTotalPages, p + 1))}
          >
            Next
          </button>
          {actionsValidating && (
            <span className={adminTextGray500} style={{ marginLeft: `0.5rem` }}>
              Updating…
            </span>
          )}
        </div>
      )}

      {activeTab === TAB_AUTH && !authLoadingData && authTotal === 0 && !authErrorData && (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No auth log entries</div>
          </div>
        </div>
      )}

      {activeTab === TAB_ACTIONS && !actionsLoadingData && actionsTotal === 0 && !actionsErrorData && (
        <div className={adminCard}>
          <div className={adminCardContent}>
            <div className={adminTextGray500}>No action audit entries</div>
          </div>
        </div>
      )}

      {activeTab === TAB_AUTH && authTotal > 0 && (
        <div style={{ position: `relative` }}>
          {authValidating && (authData?.items?.length ?? 0) > 0 && (
            <div
              style={{
                position: `absolute`,
                inset: 0,
                background: `rgba(255,255,255,0.5)`,
                display: `flex`,
                alignItems: `center`,
                justifyContent: `center`,
                zIndex: 1,
                pointerEvents: `none`,
              }}
              aria-hidden
            >
              <span className={adminTextGray500}>Updating table…</span>
            </div>
          )}
          <DataTable
            rows={authData?.items ?? []}
            getRowKeyAction={(r) => r.id}
            columns={[
              { key: `createdAt`, header: `Date`, render: (r) => formatDate(r.createdAt) },
              { key: `email`, header: `Email`, render: (r) => r.email },
              { key: `event`, header: `Event`, render: (r) => r.event },
              { key: `ipAddress`, header: `IP`, render: (r) => truncate(r.ipAddress, 45) },
              { key: `userAgent`, header: `User agent`, render: (r) => truncate(r.userAgent, 60) },
            ]}
          />
        </div>
      )}

      {activeTab === TAB_ACTIONS && actionsTotal > 0 && (
        <div style={{ position: `relative` }}>
          {actionsValidating && (actionsData?.items?.length ?? 0) > 0 && (
            <div
              style={{
                position: `absolute`,
                inset: 0,
                background: `rgba(255,255,255,0.5)`,
                display: `flex`,
                alignItems: `center`,
                justifyContent: `center`,
                zIndex: 1,
                pointerEvents: `none`,
              }}
              aria-hidden
            >
              <span className={adminTextGray500}>Updating table…</span>
            </div>
          )}
          <DataTable
            rows={actionsData?.items ?? []}
            getRowKeyAction={(r) => r.id}
            columns={[
              { key: `createdAt`, header: `Date`, render: (r) => formatDate(r.createdAt) },
              { key: `adminEmail`, header: `Admin email`, render: (r) => r.adminEmail ?? `—` },
              { key: `action`, header: `Action`, render: (r) => r.action },
              { key: `resource`, header: `Resource`, render: (r) => r.resource },
              { key: `resourceId`, header: `Resource ID`, render: (r) => truncate(r.resourceId, 12) },
              { key: `ipAddress`, header: `IP`, render: (r) => truncate(r.ipAddress, 45) },
              { key: `userAgent`, header: `User agent`, render: (r) => truncate(r.userAgent, 60) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
