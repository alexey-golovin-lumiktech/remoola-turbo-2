'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '../../../lib';

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get(`next`) || `/dashboard`;

  const next = rawNext === `/` || rawNext === `/login` ? `/dashboard` : rawNext;

  const [email, setEmail] = useState(`super.admin@wirebill.com`);
  const [password, setPassword] = useState(`SuperWirebill@Admin123!`);
  const [err, setErr] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    setLoading(true);

    const response = await apiFetch<{ ok: true }>(`/api/auth/login`, {
      method: `POST`,
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) return setErr(response.message);

    // Redirect to dashboard after successful login
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-600">Sign in to manage Remoola.</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-gray-700">Email</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-gray-700">Password</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
          >
            {loading ? `Signing in...` : `Sign in`}
          </button>
        </div>
      </form>
    </div>
  );
}
