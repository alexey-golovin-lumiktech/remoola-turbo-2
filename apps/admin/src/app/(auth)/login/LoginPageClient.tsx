'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import styles from '../../../components/ui/classNames.module.css';
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
    <div className={styles.adminLoginContainer}>
      <form onSubmit={submit} className={styles.adminLoginForm}>
        <h1 className={styles.adminLoginTitle}>Admin Login</h1>
        <p className={styles.adminLoginSubtitle}>Sign in to manage Remoola.</p>

        <div className={styles.adminLoginFields}>
          <label className={styles.adminLoginLabel}>
            <div className={styles.adminLoginLabelText}>Email</div>
            <input
              className={styles.adminLoginInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className={styles.adminLoginLabel}>
            <div className={styles.adminLoginLabelText}>Password</div>
            <input
              className={styles.adminLoginInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {err && <div className={styles.adminLoginError}>{err}</div>}

          <button disabled={loading} className={styles.adminLoginButton}>
            {loading ? `Signing in...` : `Sign in`}
          </button>
        </div>
      </form>
    </div>
  );
}
