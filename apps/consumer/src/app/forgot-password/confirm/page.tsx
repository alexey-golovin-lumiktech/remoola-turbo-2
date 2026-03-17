'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import styles from '../../../components/ui/classNames.module.css';
import { getErrorMessageForUser } from '../../../lib/error-messages';

const FALLBACK_ERROR = `Something went wrong. Please try again or request a new reset link.`;

const {
  formInputFullWidth,
  linkPrimary,
  loginButton,
  loginContainer,
  loginErrorText,
  loginForm,
  loginFooter,
  loginTitle,
} = styles;

function ForgotPasswordConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get(`token`);

  const [password, setPassword] = useState(``);
  const [confirmPassword, setConfirmPassword] = useState(``);
  const [err, setErr] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  if (!token || token.trim() === ``) {
    return (
      <div className={loginContainer} data-testid="consumer-reset-password-page">
        <h1 className={loginTitle}>Invalid or missing link</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          This reset link is invalid or has expired. Request a new one below.
        </p>
        <p className="mt-4">
          <Link href="/forgot-password" className={linkPrimary}>
            Request a new reset link
          </Link>
        </p>
        <p className={loginFooter}>
          <Link href="/login" className={linkPrimary}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    if (password.length < 8) {
      setErr(`Password must be at least 8 characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setErr(`Passwords do not match.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/consumer/auth/password/reset`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ token: token.trim(), password }),
        cache: `no-store`,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.code ?? data?.message;
        setErr(getErrorMessageForUser(code, FALLBACK_ERROR));
        return;
      }
      router.replace(`/login?reset=success`);
    } catch {
      setErr(FALLBACK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={loginContainer} data-testid="consumer-reset-password-page">
      <h1 className={loginTitle}>Set new password</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
        Enter your new password below. Use at least 8 characters.
      </p>
      <form className={loginForm} onSubmit={handleSubmit}>
        <input
          className={formInputFullWidth}
          type="password"
          autoComplete="new-password"
          placeholder="New password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          className={formInputFullWidth}
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
        />
        {err && (
          <p className={loginErrorText} role="alert">
            {err}
          </p>
        )}
        <button className={loginButton} type="submit" disabled={loading || !password || !confirmPassword}>
          {loading ? `Saving…` : `Reset password`}
        </button>
      </form>
      <p className={loginFooter}>
        <Link href="/login" className={linkPrimary}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className={loginContainer} data-testid="consumer-reset-password-page">
          <h1 className={loginTitle}>Set new password</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordConfirmContent />
    </Suspense>
  );
}
