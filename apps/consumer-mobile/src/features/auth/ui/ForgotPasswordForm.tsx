'use client';

import Link from 'next/link';
import { useState } from 'react';

import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { forgotPasswordSchema } from '../schemas';
import styles from './LoginForm.module.css';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState(``);
  const [err, setErr] = useState<string | undefined>();
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    setFieldError(undefined);

    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.email?.[0] ?? `Invalid email`;
      setFieldError(msg);
      setErr(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/consumer/auth/forgot-password`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ email: parsed.data.email }),
        cache: `no-store`,
      });
      if (!res.ok) {
        if (res.status === 429) {
          setErr(`Too many attempts. Please wait a few minutes and try again.`);
        } else {
          setErr(`Something went wrong. Please try again later.`);
        }
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
      <div className={styles.root} data-testid="consumer-mobile-forgot-password-page">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Check your email</h1>
            <p className={styles.subtitle}>
              If an account exists for that address, we sent instructions to reset your password.
            </p>
          </div>
          <div className={styles.card}>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Didn’t get an email? Check spam or try again with the same address.
            </p>
            <p className="mt-4">
              <Link href="/login" prefetch={false} className={styles.signupLink}>
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root} data-testid="consumer-mobile-forgot-password-page">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Forgot password?</h1>
          <p className={styles.subtitle}>Enter your email and we’ll send you a link to reset your password.</p>
        </div>

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div>
              <label className={styles.label} htmlFor="forgot-email">
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
                placeholder="you@example.com"
                className={`input w-full ${fieldError ? styles.inputError : ``}`}
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? `forgot-email-error` : undefined}
                data-testid="consumer-mobile-forgot-password-email"
              />
              {fieldError ? (
                <p id="forgot-email-error" className={styles.errorText} role="alert">
                  {fieldError}
                </p>
              ) : null}
            </div>

            {err ? (
              <div className={styles.errorBanner} role="alert">
                <p className={styles.errorMessage}>{err}</p>
              </div>
            ) : null}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !email.trim()}
              data-testid="consumer-mobile-forgot-password-submit"
            >
              {loading ? (
                <span className={styles.submitLoading}>
                  <SpinnerIcon className={styles.spinnerIcon} />
                  Sending…
                </span>
              ) : (
                `Send reset link`
              )}
            </button>
          </form>
        </div>

        <p className={styles.footer}>
          <Link href="/login" prefetch={false} className={styles.signupLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
