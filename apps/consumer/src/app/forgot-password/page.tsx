'use client';

import Link from 'next/link';
import { useState } from 'react';

import styles from '../../components/ui/classNames.module.css';

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(``);
  const [err, setErr] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    if (!email.trim()) {
      setErr(`Email is required.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/consumer/auth/forgot-password`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ email: email.trim() }),
        cache: `no-store`,
      });
      if (!res.ok) {
        if (res.status === 429) setErr(`Too many attempts. Please wait a few minutes and try again.`);
        else setErr(`Something went wrong. Please try again later.`);
        return;
      }
      setSuccess(true);
    } catch {
      setErr(`Network error. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={loginContainer} data-testid="consumer-forgot-password-page">
        <h1 className={loginTitle}>Check your email</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          If an account exists for that address, we sent instructions to reset your password.
        </p>
        <p className="mt-4">
          <Link href="/login" className={linkPrimary}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={loginContainer} data-testid="consumer-forgot-password-page">
      <h1 className={loginTitle}>Forgot password?</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <form className={loginForm} onSubmit={handleSubmit}>
        <input
          className={formInputFullWidth}
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {err && (
          <p className={loginErrorText} role="alert">
            {err}
          </p>
        )}
        <button className={loginButton} type="submit" disabled={loading}>
          {loading ? `Sending…` : `Send reset link`}
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
