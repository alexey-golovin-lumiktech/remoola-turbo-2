'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import styles from './AuthForm.module.css';

type TokenPasswordFormProps = {
  token: string;
  submitPath: string;
  submitLabel: string;
  successRedirectPath: string;
  successMessage: string;
};

export function TokenPasswordForm({
  token,
  submitPath,
  submitLabel,
  successRedirectPath,
  successMessage,
}: TokenPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState(``);
  const [confirmPassword, setConfirmPassword] = useState(``);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token.trim()) {
      setError(`The token is missing from this link.`);
      return;
    }
    if (password.trim().length < 8) {
      setError(`Password must be at least 8 characters long.`);
      return;
    }
    if (password !== confirmPassword) {
      setError(`Passwords do not match.`);
      return;
    }

    setPending(true);
    try {
      const response = await fetch(submitPath, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? `The request could not be completed.`);
        return;
      }

      setSuccess(successMessage);
      setPassword(``);
      setConfirmPassword(``);
      setTimeout(() => {
        router.replace(successRedirectPath);
        router.refresh();
      }, 500);
    } catch {
      setError(`The network request did not complete.`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>New password</span>
        <input
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Confirm password</span>
        <input
          className={styles.input}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          required
        />
      </label>
      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      {success ? <p className={styles.successBanner}>{success}</p> : null}
      <button className={styles.submitBtn} type="submit" disabled={pending}>
        {pending ? `Working...` : submitLabel}
      </button>
    </form>
  );
}
