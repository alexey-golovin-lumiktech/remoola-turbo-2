'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, ErrorBoundary, PageSkeleton } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { apiClient, useFormValidation, createAdminSchema, resetPasswordSchema, type AdminType } from '../../../lib';
import { useAuth, useAdmins, useCreateAdmin, useResetAdminPassword } from '../../../lib/client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

function rowPill(text: string) {
  const cls = text === `SUPER` ? styles.adminRowPillSuper : styles.adminRowPillDefault;
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

    if (me.type !== `SUPER`) {
      router.push(`/dashboard`);
      return;
    }
  }, [me, authError, authLoading, router]);

  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Data fetching with SWR
  const {
    data: admins,
    error: adminsError,
    isLoading: adminsLoading,
    mutate: mutateAdmins,
  } = useAdmins(includeDeleted);

  useEffect(() => {
    if (adminsError)
      toast.error(getErrorMessageForUser(adminsError.message, getLocalToastMessage(localToastKeys.LOAD_ADMINS)));
  }, [adminsError]);

  // Local state for forms
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPasswordAdminId, setResetPasswordAdminId] = useState<string | null>(null);

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
  });

  // Sorted admins
  const sortedAdmins = useMemo(() => {
    if (!admins) return [];
    return [...admins].sort((a, b) => {
      if (a.type !== b.type) return a.type === `SUPER` ? -1 : 1;
      return a.email.localeCompare(b.email);
    });
  }, [admins]);

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
    } catch (error: any) {
      toast.error(getErrorMessageForUser(error.message, getLocalToastMessage(localToastKeys.ADMIN_CREATE_FAILED)));
    }
  }

  const softDeleteAdmin = async (adminId: string) => {
    try {
      const response = await apiClient.patch(`admins/${adminId}`, { action: `delete` });
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      mutateAdmins();
    } catch (error: any) {
      toast.error(getErrorMessageForUser(error.message, getLocalToastMessage(localToastKeys.ADMIN_DELETE_FAILED)));
    }
  };

  const restoreAdmin = async (adminId: string) => {
    try {
      const response = await apiClient.patch(`admins/${adminId}`, { action: `restore` });
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      mutateAdmins();
    } catch (error: any) {
      toast.error(getErrorMessageForUser(error.message, getLocalToastMessage(localToastKeys.ADMIN_RESTORE_FAILED)));
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
    } catch (error: any) {
      toast.error(
        getErrorMessageForUser(error.message, getLocalToastMessage(localToastKeys.ADMIN_RESET_PASSWORD_FAILED)),
      );
    }
  }

  // Loading state
  if (authLoading || adminsLoading) {
    return <PageSkeleton />;
  }

  // Don't render if not authorized
  if (!me || me.type !== `SUPER`) {
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

          <div className={styles.adminHeaderActions}>
            <label className={styles.adminCheckboxLabel}>
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className={styles.adminCheckbox}
              />
              Include deleted
            </label>

            <button
              type="button"
              className={styles.adminPrimaryButton}
              onClick={(e) => (e.stopPropagation(), e.preventDefault(), void mutateAdmins())}
            >
              Refresh
            </button>

            <button
              onClick={(e) => (e.stopPropagation(), e.preventDefault(), setCreateOpen(true))}
              disabled={createAdminMutation.isMutating}
              className={styles.adminPrimaryButton}
            >
              {createAdminMutation.isMutating ? `Creating...` : `Create admin`}
            </button>
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

        {sortedAdmins.length === 0 ? (
          <div className={styles.adminCard}>
            <div className={styles.adminCardContent}>
              <div className={styles.adminTextGray500}>No admins</div>
            </div>
          </div>
        ) : (
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
                    <span className={`${styles.adminStatusBadgeBase} ${styles.adminStatusBadgeDeleted}`}>Deleted</span>
                  ) : (
                    <span className={`${styles.adminStatusBadgeBase} ${styles.adminStatusBadgeActive}`}>Active</span>
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
                  <div className={styles.adminActionRow}>
                    <button
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
                        className={styles.adminDeleteButton}
                        onClick={(e) => (e.stopPropagation(), e.preventDefault(), softDeleteAdmin(a.id))}
                      >
                        Delete
                      </button>
                    ) : (
                      <button
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
                <label className={styles.adminFormLabelBlock}>
                  <div className={styles.adminFormLabelText}>Email</div>
                  <input
                    className={styles.adminFormInput}
                    value={createForm.values.email}
                    onChange={(e) => createForm.setValue(`email`, e.target.value)}
                    onBlur={() => createForm.setTouched(`email`)}
                    placeholder="admin@remoola.com"
                    disabled={createAdminMutation.isMutating}
                  />
                  {createForm.errors.email && <div className={styles.adminFormError}>{createForm.errors.email}</div>}
                </label>

                <label className={styles.adminFormLabelBlock}>
                  <div className={styles.adminFormLabelText}>Type</div>
                  <select
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

                <label className={styles.adminFormLabelBlock}>
                  <div className={styles.adminFormLabelText}>Temporary password</div>
                  <input
                    className={styles.adminFormInput}
                    type="password"
                    value={createForm.values.password}
                    onChange={(e) => createForm.setValue(`password`, e.target.value)}
                    onBlur={() => createForm.setTouched(`password`)}
                    placeholder="min 8 chars"
                    disabled={createAdminMutation.isMutating}
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
                <label className={styles.adminFormLabelBlock}>
                  <div className={styles.adminFormLabelText}>New password</div>
                  <input
                    className={styles.adminFormInput}
                    type="password"
                    value={resetPasswordForm.values.password}
                    onChange={(e) => resetPasswordForm.setValue(`password`, e.target.value)}
                    onBlur={() => resetPasswordForm.setTouched(`password`)}
                    placeholder="min 8 chars"
                    disabled={resetPasswordMutation.isMutating}
                  />
                  {resetPasswordForm.errors.password && (
                    <div className={styles.adminFormError}>{resetPasswordForm.errors.password}</div>
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
      </div>
    </ErrorBoundary>
  );
}
