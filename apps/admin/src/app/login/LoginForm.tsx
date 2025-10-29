'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(`admin@example.com`);
  const [password, setPassword] = useState(`password`);
  const [err, setErr] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);

    const response = await fetch(`/api/login`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setErr(`Login failed (${response.status})`);
      return;
    }

    const me = await fetch(`/api/me`, { credentials: `include`, cache: `no-store` });
    if (!me.ok) {
      setErr(`Logged in, but cookies not available. Check CORS/cookie attrs.`);
      return;
    }

    router.replace(nextPath || `/`);
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-semibold">Admin sign in</h1>
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
