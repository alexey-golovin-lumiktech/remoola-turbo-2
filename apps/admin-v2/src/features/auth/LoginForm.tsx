'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import styles from './AuthForm.module.css';
import { loginSchema } from './schemas';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(``);
  const [password, setPassword] = useState(``);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({
      email: email.trim(),
      password,
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setError(fieldErrors.email?.[0] ?? fieldErrors.password?.[0] ?? `Login failed`);
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`/api/admin-v2/auth/login`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? `Login failed`);
        return;
      }
      router.replace(`/overview`);
      router.refresh();
    } catch {
      setError(`Login failed because the network request did not complete`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="operator@company.com"
          required
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>
      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      <button className={styles.submitBtn} type="submit" disabled={pending}>
        {pending ? `Signing in...` : `Sign in`}
      </button>
      <p className={styles.supportCopy}>
        Use your Admin v2 credentials. Session and access policy checks happen after sign in.
      </p>
      <p className={styles.inlineLinkRow}>
        <Link href="/forgot-password" className={styles.inlineLink}>
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
