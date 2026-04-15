'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(``);
  const [password, setPassword] = useState(``);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/auth/login`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? `Login failed`);
        return;
      }
      router.replace(`/consumers`);
      router.refresh();
    } catch {
      setError(`Login failed because the network request did not complete`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="loginForm" onSubmit={onSubmit}>
      <label className="field">
        <span>Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </label>
      {error ? <p className="errorText">{error}</p> : null}
      <button className="primaryButton" type="submit" disabled={pending}>
        {pending ? `Signing in...` : `Sign in`}
      </button>
    </form>
  );
}
