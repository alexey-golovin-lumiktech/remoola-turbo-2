'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ADMIN_TYPE } from '@remoola/api-types';

import { DataTable, ErrorBoundary, PageSkeleton, SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { apiClient, useFormValidation, createAdminSchema, resetPasswordSchema, type AdminType } from '../../../lib';
import { useDebouncedValue, useAuth, useAdmins, useCreateAdmin, useResetAdminPassword } from '../../../lib/client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

function rowPill(text: string) {
  const cls = text === ADMIN_TYPE.SUPER ? styles.adminRowPillSuper : styles.adminRowPillDefault;
  return <span className={`${styles.adminRowPillBase} ${cls}`}>{text}</span>;
}

export function AdminsPageClient() {
  const router = useRouter();

  // Auth check
  const { data: me, error: authError, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated or not SUPER
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

  const DEFAULT_PAGE_SIZE = 10;
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [typeFilter, setTypeFilter] = useState(``);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);

  // Data fetching with SWR (keepPreviousData so filters only refresh table, not whole view)
  const {
    data: adminsData,
    error: adminsError,
    isLoading: adminsLoading,
    isValidating: adminsValidating,
    mutate: mutateAdmins,
  } = useAdmins({
    includeDeleted,
    q: qDebounced || undefined,
    type: typeFilter || undefined,
    page,
    pageSize,
  });

  const total = adminsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const resetFilters = () => {
    setQ(``);
    setTypeFilter(``);
    setIncludeDeleted(false);
    setPage(1);
  };

  useEffect(() => {
    if (adminsError)
      toast.error(getErrorMessageForUser(adminsError.message, getLocalToastMessage(localToastKeys.LOAD_ADMINS)));
  }, [adminsError]);

  // Local state for forms
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPasswordAdminId, setResetPasswordAdminId] = useState<string | null>(null);
  const [deleteTargetAdminId, setDeleteTargetAdminId] = useState<string | null>(null);
  const [deletePasswordConfirmation, setDeletePasswordConfirmation] = useState(``);

  // Mutations
  const createAdminMutation = useCreateAdmin();
  const resetPasswordMutation = useResetAdminPassword(resetPasswordAdminId ?? ``);

  // Form validation hooks
  const createForm = useFormValidation(createAdminSchema, {
    email: ``,
    password: ``,
    type: `ADMIN` as AdminType,
  });

  const resetPasswordForm = useFormValidation(resetPasswordSchema, {
    password: ``,
    passwordConfirmation: ``,
  });

  // Sorted admins (items already ordered by API; keep sort for consistency)
  const sortedAdmins = useMemo(() => {
    const items = adminsData?.items ?? [];
    return [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === ADMIN_TYPE.SUPER ? -1 : 1;
      return a.email.localeCompare(b.email);
    });
  }, [adminsData?.items]);

  // Form handlers with validation
  async function createAdmin() {
    const validation = createForm.validate();
    if (!validation.success) {
      toast.error(getLocalToastMessage(localToastKeys.ADMIN_FORM_FIX_ERRORS));
      return;
    }

    try {
      await createAdminMutation.trigger(validation.data);

      createForm.reset();
      setCreateOpen(false);
      mutateAdmins();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.ADMIN_CREATE_FAILED)));
    }
  }

  const confirmDeleteAdmin = async () => {
    if (!deleteTargetAdminId) return;
    const passwordTrimmed = deletePasswordConfirmation.trim();
    if (!passwordTrimmed) {
      toast.error(getLocalToastMessage(localToastKeys.STEP_UP_PASSWORD_REQUIRED));
      return;
    }
    try {
      const response = await apiClient.patch(`admins/${deleteTargetAdminId}`, {
        action: `delete`,
        passwordConfirmation: passwordTrimmed,
      });
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      setDeleteTargetAdminId(null);
      setDeletePasswordConfirmation(``);
      mutateAdmins();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.ADMIN_DELETE_FAILED)));
    }
  };

  const restoreAdmin = async (adminId: string) => {
    try {
      const response = await apiClient.patch(`admins/${adminId}`, { action: `restore` });
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      mutateAdmins();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.ADMIN_RESTORE_FAILED)));
    }
  };

  async function submitResetPassword() {
    if (!resetPasswordAdminId) return;

    const validation = resetPasswordForm.validate();
    if (!validation.success) {
      toast.error(getLocalToastMessage(localToastKeys.ADMIN_FORM_FIX_ERRORS));
      return;
    }

    try {
      await resetPasswordMutation.trigger(validation.data, {
        revalidate: false,
        populateCache: false,
      });

      setResetPasswordAdminId(null);
      resetPasswordForm.reset();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.ADMIN_RESET_PASSWORD_FAILED)));
    }
  }

  // Loading state
  if (authLoading || adminsLoading) {
    return <PageSkeleton />;
  }

  // Don't render if not authorized
  if (!me || me.type !== ADMIN_TYPE.SUPER) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className={styles.adminPageStack}>
        <div className={styles.adminHeaderRow}>
          <div>
            <h1 className={styles.adminPageTitle}>Admins</h1>
            <p className={styles.adminPageSubtitle}>Manage Admins (SUPER-only).</p>
          </div>

          <div className={styles.adminActionRow}>
            <button
              type="button"
              className={styles.adminPrimaryButton}
              onClick={(e) => (e.stopPropagation(), e.preventDefault(), void mutateAdmins())}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), e.preventDefault(), setCreateOpen(true))}
              disabled={createAdminMutation.isMutating}
              className={styles.adminPrimaryButton}
            >
              {createAdminMutation.isMutating ? `Creating...` : `Create admin`}
            </button>
          </div>
        </div>

        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <div className={styles.adminFilterRow}>
              <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="admins-search">
                <span className={styles.adminFormLabelText}>Search</span>
                <SearchWithClear
                  id="admins-search"
                  name="q"
                  value={q}
                  onChangeAction={(v) => {
                    setQ(v);
                    setPage(1);
                  }}
                  placeholder="Search by email"
                />
              </label>
              <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="admins-type-filter">
                <span className={styles.adminFormLabelText}>Type</span>
                <select
                  id="admins-type-filter"
                  name="typeFilter"
                  className={styles.adminFormInput}
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="SUPER">SUPER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <div className={styles.adminFilterLine1Actions}>
                <button type="button" className={styles.adminPrimaryButton} onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
            <div className={styles.adminFilterCheckboxesRow}>
              <div className={styles.adminFilterCheckboxes}>
                <label
                  className={styles.adminCheckboxLabel}
                  style={{ marginBottom: 0 }}
                  htmlFor="admins-include-deleted"
                >
                  <input
                    id="admins-include-deleted"
                    name="includeDeleted"
                    type="checkbox"
                    checked={includeDeleted}
                    onChange={(e) => {
                      setIncludeDeleted(e.target.checked);
                      setPage(1);
                    }}
                    className={styles.adminCheckbox}
                  />
                  Include deleted
                </label>
              </div>
            </div>
          </div>
        </div>

        {adminsError && (
          <div className={styles.adminCard}>
            <div className={styles.adminCardContent}>
              <button type="button" className={styles.adminPrimaryButton} onClick={() => void mutateAdmins()}>
                Retry
              </button>
            </div>
          </div>
        )}

        {total > 0 && (
          <>
            <div className={styles.adminPaginationBar}>
              <span className={styles.adminPaginationInfo}>
                Showing {from}–{to} of {total}
              </span>
              <button
                type="button"
                className={styles.adminPaginationButton}
                disabled={page <= 1 || adminsValidating}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className={styles.adminPaginationInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className={styles.adminPaginationButton}
                disabled={page >= totalPages || adminsValidating}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
              {adminsValidating && (
                <span className={styles.adminTextGray500} style={{ marginLeft: `0.5rem` }}>
                  Updating…
                </span>
              )}
            </div>

            <div style={{ position: `relative` }}>
              {adminsValidating && (
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
                  <span className={styles.adminTextGray500}>Updating table…</span>
                </div>
              )}
              <DataTable
                rows={sortedAdmins}
                getRowKeyAction={(a) => a.id}
                rowHrefAction={(r) => `/admins/${r.id}`}
                columns={[
                  {
                    key: `type`,
                    header: `Type`,
                    render: (a) => rowPill(a.type),
                  },
                  {
                    key: `email`,
                    header: `Email`,
                    render: (a) => <span className={styles.adminTextMedium}>{a.email}</span>,
                  },
                  {
                    key: `status`,
                    header: `Status`,
                    render: (a) =>
                      a.deletedAt ? (
                        <span className={`${styles.adminStatusBadgeBase} ${styles.adminStatusBadgeDeleted}`}>
                          Deleted
                        </span>
                      ) : (
                        <span className={`${styles.adminStatusBadgeBase} ${styles.adminStatusBadgeActive}`}>
                          Active
                        </span>
                      ),
                  },
                  {
                    key: `created`,
                    header: `Created`,
                    render: (a) => (
                      <span className={styles.adminTextGray600}>{new Date(a.createdAt).toLocaleString()}</span>
                    ),
                  },
                  {
                    key: `updated`,
                    header: `Updated`,
                    render: (a) => (
                      <span className={styles.adminTextGray600}>{new Date(a.updatedAt).toLocaleString()}</span>
                    ),
                  },
                  {
                    key: `actions`,
                    header: `Actions`,
                    render: (a) => (
                      <div
                        className={styles.adminActionRow}
                        role="group"
                        aria-label="Row actions"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === `Enter` || e.key === ` `) e.stopPropagation();
                        }}
                      >
                        <button
                          type="button"
                          className={styles.adminActionButton}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResetPasswordAdminId(a.id);
                            resetPasswordForm.reset();
                          }}
                        >
                          Reset password
                        </button>

                        {!a.deletedAt ? (
                          <button
                            type="button"
                            className={styles.adminDeleteButton}
                            onClick={(e) => (
                              e.stopPropagation(),
                              e.preventDefault(),
                              setDeleteTargetAdminId(a.id),
                              setDeletePasswordConfirmation(``)
                            )}
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.adminRestoreButton}
                            onClick={(e) => (e.stopPropagation(), e.preventDefault(), restoreAdmin(a.id))}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    ),
                    className: `w-[260px]`,
                  },
                ]}
              />
            </div>
          </>
        )}

        {!adminsLoading && total === 0 && (
          <div className={styles.adminCard}>
            <div className={styles.adminCardContent}>
              <div className={styles.adminTextGray500}>No admins</div>
            </div>
          </div>
        )}

        {/* Create modal */}
        {createOpen && (
          <div className={styles.adminModalOverlay}>
            <div className={styles.adminModalCard}>
              <div className={styles.adminModalHeader}>
                <div>
                  <div className={styles.adminModalTitle}>Create admin</div>

                  <div className={styles.adminModalSubtitle}>Creates a new Admin record.</div>
                </div>
                <button
                  type="button"
                  className={styles.adminModalClose}
                  onClick={(e) => (e.stopPropagation(), e.preventDefault(), setCreateOpen(false))}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className={styles.adminModalBody}>
                <label className={styles.adminFormLabelBlock} htmlFor="admin-create-email">
                  <div className={styles.adminFormLabelText}>Email</div>
                  <input
                    id="admin-create-email"
                    name="email"
                    className={styles.adminFormInput}
                    value={createForm.values.email}
                    onChange={(e) => createForm.setValue(`email`, e.target.value)}
                    onBlur={() => createForm.setTouched(`email`)}
                    placeholder="admin@remoola.com"
                    disabled={createAdminMutation.isMutating}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  {createForm.errors.email && <div className={styles.adminFormError}>{createForm.errors.email}</div>}
                </label>

                <label className={styles.adminFormLabelBlock} htmlFor="admin-create-type">
                  <div className={styles.adminFormLabelText}>Type</div>
                  <select
                    id="admin-create-type"
                    name="type"
                    className={styles.adminFormInput}
                    value={createForm.values.type}
                    onChange={(e) => createForm.setValue(`type`, e.target.value as AdminType)}
                    onBlur={() => createForm.setTouched(`type`)}
                    disabled={createAdminMutation.isMutating}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER">SUPER</option>
                  </select>
                  {createForm.errors.type && <div className={styles.adminFormError}>{createForm.errors.type}</div>}
                </label>

                <label className={styles.adminFormLabelBlock} htmlFor="admin-create-password">
                  <div className={styles.adminFormLabelText}>Temporary password</div>
                  <input
                    id="admin-create-password"
                    name="password"
                    className={styles.adminFormInput}
                    type="password"
                    value={createForm.values.password}
                    onChange={(e) => createForm.setValue(`password`, e.target.value)}
                    onBlur={() => createForm.setTouched(`password`)}
                    placeholder="min 8 chars"
                    disabled={createAdminMutation.isMutating}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  {createForm.errors.password && (
                    <div className={styles.adminFormError}>{createForm.errors.password}</div>
                  )}
                  <div className={styles.adminFormHelp}>Backend should hash + salt; FE never stores it.</div>
                </label>

                <div className={styles.adminModalFooter}>
                  <button
                    className={styles.adminModalCancel}
                    onClick={(e) => (e.stopPropagation(), e.preventDefault(), setCreateOpen(false))}
                    disabled={createAdminMutation.isMutating}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.adminModalPrimary}
                    onClick={createAdmin}
                    disabled={createAdminMutation.isMutating}
                  >
                    {createAdminMutation.isMutating ? `Creating...` : `Create`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset password modal */}
        {resetPasswordAdminId && (
          <div className={styles.adminModalOverlay}>
            <div className={styles.adminModalCard}>
              {` `}
              <div className={styles.adminModalHeader}>
                <div>
                  <div className={styles.adminModalTitle}>Reset password</div>
                  <div className={styles.adminModalSubtitle}>Sets a new password for this admin.</div>
                </div>
                <button
                  type="button"
                  className={styles.adminModalClose}
                  onClick={(e) => (e.stopPropagation(), e.preventDefault(), setResetPasswordAdminId(null))}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className={styles.adminModalBody}>
                <label className={styles.adminFormLabelBlock} htmlFor="admin-reset-password-new">
                  <div className={styles.adminFormLabelText}>New password</div>
                  <input
                    id="admin-reset-password-new"
                    name="newPassword"
                    className={styles.adminFormInput}
                    type="password"
                    value={resetPasswordForm.values.password}
                    onChange={(e) => resetPasswordForm.setValue(`password`, e.target.value)}
                    onBlur={() => resetPasswordForm.setTouched(`password`)}
                    placeholder="min 8 chars"
                    disabled={resetPasswordMutation.isMutating}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  {resetPasswordForm.errors.password && (
                    <div className={styles.adminFormError}>{resetPasswordForm.errors.password}</div>
                  )}
                </label>
                <label className={styles.adminFormLabelBlock} htmlFor="admin-reset-password-confirm">
                  <div className={styles.adminFormLabelText}>Re-enter your password to continue</div>
                  <input
                    id="admin-reset-password-confirm"
                    name="passwordConfirmation"
                    className={styles.adminFormInput}
                    type="password"
                    value={resetPasswordForm.values.passwordConfirmation}
                    onChange={(e) => resetPasswordForm.setValue(`passwordConfirmation`, e.target.value)}
                    onBlur={() => resetPasswordForm.setTouched(`passwordConfirmation`)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    disabled={resetPasswordMutation.isMutating}
                  />
                  {resetPasswordForm.errors.passwordConfirmation && (
                    <div className={styles.adminFormError}>{resetPasswordForm.errors.passwordConfirmation}</div>
                  )}
                </label>

                <div className={styles.adminModalFooter}>
                  <button
                    className={styles.adminModalCancel}
                    onClick={(e) => (e.stopPropagation(), e.preventDefault(), setResetPasswordAdminId(null))}
                    disabled={resetPasswordMutation.isMutating}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.adminModalPrimary}
                    onClick={(e) => (e.stopPropagation(), e.preventDefault(), submitResetPassword())}
                    disabled={resetPasswordMutation.isMutating}
                  >
                    {resetPasswordMutation.isMutating ? `Saving...` : `Save`}
                  </button>
                </div>

                {resetPasswordAdminId === me?.id && (
                  <div className={styles.adminWarningNote}>
                    You`re resetting your own password — make sure you remember it.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete admin — step-up confirmation */}
        {deleteTargetAdminId && (
          <div className={styles.adminModalOverlay}>
            <div className={styles.adminModalCard}>
              <div className={styles.adminModalHeader}>
                <div>
                  <div className={styles.adminModalTitle}>Confirm delete admin</div>
                  <div className={styles.adminModalSubtitle}>
                    Re-enter your password to confirm. This will soft-delete the admin account.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.adminModalClose}
                  onClick={(e) => (
                    e.stopPropagation(),
                    e.preventDefault(),
                    setDeleteTargetAdminId(null),
                    setDeletePasswordConfirmation(``)
                  )}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className={styles.adminModalBody}>
                <label className={styles.adminFormLabelBlock} htmlFor="admin-delete-password-confirm">
                  <span className={styles.adminFormLabelText}>Your password</span>
                  <input
                    id="admin-delete-password-confirm"
                    name="passwordConfirmation"
                    type="password"
                    className={styles.adminFormInput}
                    value={deletePasswordConfirmation}
                    onChange={(e) => setDeletePasswordConfirmation(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                </label>
                <div className={styles.adminModalFooter}>
                  <button
                    className={styles.adminModalCancel}
                    onClick={(e) => (
                      e.stopPropagation(),
                      e.preventDefault(),
                      setDeleteTargetAdminId(null),
                      setDeletePasswordConfirmation(``)
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.adminModalPrimary}
                    onClick={(e) => (e.stopPropagation(), e.preventDefault(), void confirmDeleteAdmin())}
                    disabled={!deletePasswordConfirmation.trim()}
                  >
                    Delete admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
