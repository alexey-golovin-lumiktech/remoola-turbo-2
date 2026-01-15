'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { DataTable } from '../../../components/DataTable';
import { apiFetch } from '../../../lib/api';
import { type AdminMe, type AdminType, type AdminUser } from '../../../lib/types';

function rowPill(text: string) {
  const cls =
    text === `SUPER` ? `bg-purple-50 text-purple-700 border-purple-200` : `bg-gray-50 text-gray-700 border-gray-200`;
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${cls}`}>{text}</span>;
}

export default function AdminsPage() {
  const router = useRouter();

  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [err, setErr] = useState<string>();

  // create
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(``);
  const [newType, setNewType] = useState<AdminType>(`ADMIN`);
  const [newPassword, setNewPassword] = useState(``);

  // reset password
  const [resetPasswordAdminId, setResetPasswordAdminId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState(``);

  async function loadMe() {
    const response = await apiFetch<AdminMe>(`/api/auth/me`);
    if (!response.ok) return null;
    return response.data;
  }

  async function loadAdmins(nextIncludeDeleted = includeDeleted) {
    setLoading(true);
    setErr(undefined);

    const search = nextIncludeDeleted ? `?includeDeleted=1` : ``;
    const response = await apiFetch<AdminUser[]>(`/api/admins${search}`);
    setLoading(false);

    if (!response.ok) {
      setErr(response.message);
      setAdmins([]);
      return;
    }
    setAdmins(response.data);
  }

  useEffect(() => {
    (async () => {
      const me = await loadMe();
      setMe(me);

      // SUPER only
      if (!me) {
        router.push(`/login`);
        return;
      }
      if (me.type !== `SUPER`) {
        router.push(`/dashboard`);
        return;
      }

      await loadAdmins(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me) return;
    if (me.type !== `SUPER`) return;
    loadAdmins(includeDeleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  const sorted = useMemo(() => {
    // keep SUPER first, then email
    return [...admins].sort((a, b) => {
      if (a.type !== b.type) return a.type === `SUPER` ? -1 : 1;
      return a.email.localeCompare(b.email);
    });
  }, [admins]);

  async function createAdmin() {
    setErr(undefined);

    if (!newEmail.trim()) return setErr(`Email is required`);
    if (!newPassword || newPassword.length < 8) return setErr(`Password must be at least 8 characters`);

    const response = await apiFetch<AdminUser>(`/api/admins`, {
      method: `POST`,
      body: JSON.stringify({ email: newEmail.trim(), password: newPassword, type: newType }),
    });

    if (!response.ok) return setErr(response.message);

    setCreateOpen(false);
    setNewEmail(``);
    setNewPassword(``);
    setNewType(`ADMIN`);
    await loadAdmins(includeDeleted);
  }

  async function softDeleteAdmin(adminId: string) {
    setErr(undefined);
    if (adminId === me?.id) return setErr(`You cannot delete yourself.`);

    const response = await apiFetch<AdminUser>(`/api/admins/${adminId}`, {
      method: `PATCH`,
      body: JSON.stringify({ action: `delete` }),
    });

    if (!response.ok) return setErr(response.message);
    await loadAdmins(includeDeleted);
  }

  async function restoreAdmin(adminId: string) {
    setErr(undefined);
    const response = await apiFetch<AdminUser>(`/api/admins/${adminId}`, {
      method: `PATCH`,
      body: JSON.stringify({ action: `restore` }),
    });
    if (!response.ok) return setErr(response.message);
    await loadAdmins(includeDeleted);
  }

  async function submitResetPassword() {
    if (!resetPasswordAdminId) return;
    setErr(undefined);

    if (!resetPassword || resetPassword.length < 8) return setErr(`Password must be at least 8 characters`);

    const response = await apiFetch<{ ok: true }>(`/api/admins/${resetPasswordAdminId}/password`, {
      method: `PATCH`,
      body: JSON.stringify({ password: resetPassword }),
    });

    if (!response.ok) return setErr(response.message);

    setResetPasswordAdminId(null);
    setResetPassword(``);
  }

  return (
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
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Create admin
          </button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>}

      <DataTable
        rows={sorted}
        getRowKeyAction={(a) => a.id}
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
                <span
                  className="inline-flex rounded-full border border-red-200 bg-red-50
                px-2 py-0.5 text-xs text-red-700"
                >
                  Deleted
                </span>
              ) : (
                <span
                  className="inline-flex rounded-full border border-green-200 bg-green-50
                px-2 py-0.5 text-xs text-green-700"
                >
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
                    setResetPassword(``);
                  }}
                >
                  Reset password
                </button>

                {!a.deletedAt ? (
                  <button
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs
                    text-red-700 hover:bg-red-100 disabled:opacity-60"
                    disabled={a.id === me?.id}
                    onClick={() => softDeleteAdmin(a.id)}
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    className="rounded-lg border border-green-200 bg-green-50 px-2 py-1
                    text-xs text-green-700 hover:bg-green-100"
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

      {loading && <div className="text-sm text-gray-600">Loading…</div>}

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
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@remoola.com"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-xs font-medium text-gray-700">Type</div>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AdminType)}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER">SUPER</option>
                </select>
              </label>

              <label className="block">
                <div className="mb-1 text-xs font-medium text-gray-700">Temporary password</div>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min 8 chars"
                />
                <div className="mt-1 text-xs text-gray-500">Backend should hash + salt; FE never stores it.</div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white" onClick={createAdmin}>
                  Create
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
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="min 8 chars"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setResetPasswordAdminId(null)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                  onClick={submitResetPassword}
                >
                  Save
                </button>
              </div>

              {resetPasswordAdminId === me?.id && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  You’re resetting your own password — make sure you remember it.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
