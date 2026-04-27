'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import styles from './AuthForm.module.css';
import { forgotPasswordSchema } from './schemas';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState(``);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      const message = parsed.error.flatten().fieldErrors.email?.[0] ?? `Please enter a valid email address.`;
      setFieldError(message);
      setError(message);
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/admin-v2/auth/forgot-password`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify(parsed.data),
        cache: `no-store`,
      });
      if (!response.ok) {
        if (response.status === 429) {
          setError(`Too many attempts. Please wait a few minutes and try again.`);
        } else {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? `We could not send recovery instructions. Please try again.`);
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setError(`Network error. Please check your connection and try again.`);
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.successBanner}>
        <p>
          If an active admin account exists, we sent recovery instructions. Check your inbox for the Admin v2 reset
          link.
        </p>
        <p className={styles.helperCopy}>If nothing arrives, verify the address and try again in a few minutes.</p>
        <p className={styles.inlineLinkRow}>
          <Link href="/login" className={styles.inlineLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(null);
          }}
          type="email"
          autoComplete="email"
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `admin-forgot-password-email-error` : undefined}
        />
      </label>
      {fieldError ? (
        <p id="admin-forgot-password-email-error" className={styles.fieldError} role="alert">
          {fieldError}
        </p>
      ) : null}
      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      <button className={styles.submitBtn} type="submit" disabled={pending}>
        {pending ? `Sending...` : `Send reset link`}
      </button>
      <p className={styles.inlineLinkRow}>
        <Link href="/login" className={styles.inlineLink}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
