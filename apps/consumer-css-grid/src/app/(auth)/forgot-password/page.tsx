'use client';

import Link from 'next/link';
import { useState } from 'react';

import { getForgotPasswordSuccessCopy, parseForgotPasswordResponse } from '../../../features/auth/recovery';
import { forgotPasswordSchema } from '../../../features/auth/schemas';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import styles from '../auth-pages.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(``);
  const [error, setError] = useState<string | undefined>();
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successCopy, setSuccessCopy] = useState(() => getForgotPasswordSuccessCopy(`default`));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setFieldError(undefined);

    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      const message = parsed.error.flatten().fieldErrors.email?.[0] ?? `Please enter a valid email address.`;
      setFieldError(message);
      setError(message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/consumer/auth/forgot-password`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ email: parsed.data.email }),
        cache: `no-store`,
      });

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Too many attempts. Please wait a few minutes and try again.`);
        } else {
          setError(`We could not send the reset email. Please try again.`);
        }
        return;
      }

      const payload = await response.json().catch(() => null);
      const parsedResponse = parseForgotPasswordResponse(payload);
      setSuccessCopy(getForgotPasswordSuccessCopy(parsedResponse.recoveryMode));
      setSubmitted(true);
    } catch {
      setError(`Network error. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.root}>
        <div className={styles.narrowContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>{successCopy.title}</h1>
            <p className={styles.subtitle}>{successCopy.subtitle}</p>
          </div>

          <div className={styles.card}>
            <div className={styles.successBanner}>
              <p className={styles.successMessage}>{successCopy.banner}</p>
            </div>
          </div>

          <p className={styles.footer}>
            <Link href="/login" prefetch={false} className={styles.link}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.narrowContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Forgot password?</h1>
          <p className={styles.subtitle}>
            Enter your email and we&apos;ll send recovery instructions matched to how you sign in.
          </p>
        </div>

        <div className={styles.card}>
          <form className={styles.stack} onSubmit={handleSubmit} noValidate>
            <div>
              <label className={styles.label} htmlFor="forgot-password-email">
                Email address
              </label>
              <input
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
                className={`input w-full ${fieldError ? styles.inputError : ``}`}
                placeholder="you@example.com"
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? `forgot-password-email-error` : undefined}
              />
              {fieldError ? (
                <p id="forgot-password-email-error" className={styles.errorText} role="alert">
                  {fieldError}
                </p>
              ) : null}
            </div>

            {error ? (
              <div className={styles.errorBanner} role="alert">
                <p className={styles.errorMessage}>{error}</p>
              </div>
            ) : null}

            <button type="submit" className={styles.submitBtn} disabled={loading || !email.trim()}>
              {loading ? (
                <span className={styles.spinnerRow}>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                `Send reset link`
              )}
            </button>
          </form>
        </div>

        <p className={styles.footer}>
          <Link href="/login" prefetch={false} className={styles.link}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
