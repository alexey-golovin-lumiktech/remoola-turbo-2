'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '../lib/api';

export function Topbar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await apiFetch(`/api/auth/logout`, { method: `POST` });
    router.push(`/login`);
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="text-sm text-gray-600">Admin Panel</div>
      <button
        disabled={loading}
        onClick={logout}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? `Signing out...` : `Sign out`}
      </button>
    </header>
  );
}
