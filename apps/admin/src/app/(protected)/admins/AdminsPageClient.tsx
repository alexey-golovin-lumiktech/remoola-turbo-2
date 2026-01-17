'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { DataTable, ErrorBoundary, PageSkeleton } from '../../../components';
import { apiClient, useFormValidation, createAdminSchema, resetPasswordSchema, type AdminType } from '../../../lib';
import { useAuth, useAdmins, useCreateAdmin, useResetAdminPassword } from '../../../lib/client';

function rowPill(text: string) {
  const cls =
    text === `SUPER` ? `bg-purple-50 text-purple-700 border-purple-200` : `bg-gray-50 text-gray-700 border-gray-200`;
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${cls}`}>{text}</span>;
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
  const [err, setErr] = useState<string>();

  // Data fetching with SWR
  const {
    data: admins,
    error: adminsError,
    isLoading: adminsLoading,
    mutate: mutateAdmins,
  } = useAdmins(includeDeleted);

  // Mutations
  const createAdminMutation = useCreateAdmin();
  const resetPasswordMutation = useResetAdminPassword(``);

  // Local state for forms
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPasswordAdminId, setResetPasswordAdminId] = useState<string | null>(null);

  // Form validation hooks
  const createForm = useFormValidation(createAdminSchema, {
    email: ``,
    password: ``,
    type: `ADMIN` as AdminType,
  });

  const resetPasswordForm = useFormValidation(resetPasswordSchema, {
    password: ``,
  });

  // Combine errors
  const displayError = err || adminsError?.message;

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
    setErr(undefined);

    const validation = createForm.validate();
    if (!validation.success) {
      setErr(`Please fix the form errors`);
      return;
    }

    try {
      await createAdminMutation.trigger(validation.data);

      // Reset form and close modal
      createForm.reset();
      setCreateOpen(false);

      // Refetch data
      mutateAdmins();
    } catch (error: any) {
      setErr(error.message || `Failed to create admin`);
    }
  }

  const softDeleteAdmin = async (adminId: string) => {
    setErr(undefined);
    if (adminId === me?.id) return setErr(`You cannot delete yourself.`);

    try {
      const response = await apiClient.patch(`admins/${adminId}`, { action: `delete` });
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      mutateAdmins();
    } catch (error: any) {
      setErr(error.message || `Failed to delete admin`);
    }
  };

  const restoreAdmin = async (adminId: string) => {
    setErr(undefined);
    try {
      const response = await apiClient.patch(`admins/${adminId}`, { action: `restore` });
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      mutateAdmins();
    } catch (error: any) {
      setErr(error.message || `Failed to restore admin`);
    }
  };

  async function submitResetPassword() {
    if (!resetPasswordAdminId) return;
    setErr(undefined);

    const validation = resetPasswordForm.validate();
    if (!validation.success) {
      setErr(`Please fix the form errors`);
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
      setErr(error.message || `Failed to reset password`);
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
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Admins</h1>
            <p className="text-sm text-gray-600">Manage Admins (SUPER-only).</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="h-4 w-4"
              />
              Include deleted
            </label>

            <button
              onClick={() => setCreateOpen(true)}
              disabled={createAdminMutation.isMutating}
              className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {createAdminMutation.isMutating ? `Creating...` : `Create admin`}
            </button>
          </div>
        </div>

        {displayError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {displayError}
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
              render: (a) => <span className="font-medium">{a.email}</span>,
            },
            {
              key: `status`,
              header: `Status`,
              render: (a) =>
                a.deletedAt ? (
                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    Deleted
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                    Active
                  </span>
                ),
            },
            {
              key: `created`,
              header: `Created`,
              render: (a) => <span className="text-gray-600">{new Date(a.createdAt).toLocaleString()}</span>,
            },
            {
              key: `updated`,
              header: `Updated`,
              render: (a) => <span className="text-gray-600">{new Date(a.updatedAt).toLocaleString()}</span>,
            },
            {
              key: `actions`,
              header: `Actions`,
              render: (a) => (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                    onClick={() => {
                      setResetPasswordAdminId(a.id);
                      resetPasswordForm.reset();
                    }}
                  >
                    Reset password
                  </button>

                  {!a.deletedAt ? (
                    <button
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                      disabled={a.id === me?.id}
                      onClick={() => softDeleteAdmin(a.id)}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                      onClick={() => restoreAdmin(a.id)}
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

        {/* Create modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Create admin</div>
                  <div className="text-sm text-gray-600">Creates a new Admin record.</div>
                </div>
                <button className="rounded-lg border px-2 py-1 text-sm" onClick={() => setCreateOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-700">Email</div>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={createForm.values.email}
                    onChange={(e) => createForm.setValue(`email`, e.target.value)}
                    onBlur={() => createForm.setTouched(`email`)}
                    placeholder="admin@remoola.com"
                    disabled={createAdminMutation.isMutating}
                  />
                  {createForm.errors.email && (
                    <div className="mt-1 text-xs text-red-600">{createForm.errors.email}</div>
                  )}
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-700">Type</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={createForm.values.type}
                    onChange={(e) => createForm.setValue(`type`, e.target.value as AdminType)}
                    onBlur={() => createForm.setTouched(`type`)}
                    disabled={createAdminMutation.isMutating}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER">SUPER</option>
                  </select>
                  {createForm.errors.type && <div className="mt-1 text-xs text-red-600">{createForm.errors.type}</div>}
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-700">Temporary password</div>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    type="password"
                    value={createForm.values.password}
                    onChange={(e) => createForm.setValue(`password`, e.target.value)}
                    onBlur={() => createForm.setTouched(`password`)}
                    placeholder="min 8 chars"
                    disabled={createAdminMutation.isMutating}
                  />
                  {createForm.errors.password && (
                    <div className="mt-1 text-xs text-red-600">{createForm.errors.password}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">Backend should hash + salt; FE never stores it.</div>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setCreateOpen(false)}
                    disabled={createAdminMutation.isMutating}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Reset password</div>
                  <div className="text-sm text-gray-600">Sets a new password for this admin.</div>
                </div>
                <button className="rounded-lg border px-2 py-1 text-sm" onClick={() => setResetPasswordAdminId(null)}>
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-700">New password</div>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    type="password"
                    value={resetPasswordForm.values.password}
                    onChange={(e) => resetPasswordForm.setValue(`password`, e.target.value)}
                    onBlur={() => resetPasswordForm.setTouched(`password`)}
                    placeholder="min 8 chars"
                    disabled={resetPasswordMutation.isMutating}
                  />
                  {resetPasswordForm.errors.password && (
                    <div className="mt-1 text-xs text-red-600">{resetPasswordForm.errors.password}</div>
                  )}
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setResetPasswordAdminId(null)}
                    disabled={resetPasswordMutation.isMutating}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                    onClick={submitResetPassword}
                    disabled={resetPasswordMutation.isMutating}
                  >
                    {resetPasswordMutation.isMutating ? `Saving...` : `Save`}
                  </button>
                </div>

                {resetPasswordAdminId === me?.id && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                    You're resetting your own password — make sure you remember it.
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
