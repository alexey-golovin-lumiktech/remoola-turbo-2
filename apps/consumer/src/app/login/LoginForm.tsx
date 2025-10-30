'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(`user@example.com`);
  const [password, setPassword] = useState(`password`);
  const [err, setErr] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);

    const loginRequest = await fetch(`/api/login`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRequest.ok) {
      setErr(`Login failed (${loginRequest.status})`);
      return;
    }

    const meRequest = await fetch(`/api/me`, { credentials: `include` });
    if (!meRequest.ok) {
      setErr(`Logged in, but cookies not available. Check CORS/cookie attrs.`);
      return;
    }

    router.replace(nextPath || `/dashboard`);
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>
      <form className="space-y-3" onSubmit={submit}>
        <input
          className="w-full rounded-md border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {err && <p className="text-sm text-rose-600 whitespace-pre-wrap">{err}</p>}
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">Login</button>
      </form>
    </div>
  );
}
