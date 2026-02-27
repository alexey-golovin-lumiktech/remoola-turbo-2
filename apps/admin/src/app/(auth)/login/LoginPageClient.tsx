'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import styles from '../../../components/ui/classNames.module.css';
import { apiFetch, resetSessionExpiredHandled } from '../../../lib';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get(`next`) || `/dashboard`;

  useEffect(() => {
    resetSessionExpiredHandled();
  }, []);

  const next = rawNext === `/` || rawNext === `/login` ? `/dashboard` : rawNext;

  const [email, setEmail] = useState(`super.admin@wirebill.com`);
  const [password, setPassword] = useState(`SuperWirebill@Admin123!`);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(getLocalToastMessage(localToastKeys.LOGIN_EMAIL_PASSWORD_REQUIRED));
      return;
    }
    setLoading(true);

    const response = await apiFetch<{ ok: true }>(`/api/auth/login`, {
      method: `POST`,
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      toast.error(getErrorMessageForUser(response.message, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)));
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className={styles.adminLoginContainer}>
      <form onSubmit={submit} className={styles.adminLoginForm}>
        <h1 className={styles.adminLoginTitle}>Admin Login</h1>
        <p className={styles.adminLoginSubtitle}>Sign in to manage Remoola.</p>

        <div className={styles.adminLoginFields}>
          <label className={styles.adminLoginLabel} htmlFor="login-email">
            <div className={styles.adminLoginLabelText}>Email</div>
            <input
              id="login-email"
              name="email"
              className={styles.adminLoginInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </label>

          <label className={styles.adminLoginLabel} htmlFor="login-password">
            <div className={styles.adminLoginLabelText}>Password</div>
            <input
              id="login-password"
              name="password"
              className={styles.adminLoginInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </label>

          <button type="submit" disabled={loading} className={styles.adminLoginButton}>
            {loading ? `Signing in...` : `Sign in`}
          </button>
        </div>
      </form>
    </div>
  );
}
