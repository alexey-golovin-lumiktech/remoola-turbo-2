'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { AUTH_NOTICE_QUERY, AUTH_RATE_LIMIT_MESSAGE } from '@remoola/api-types';

import { resetPasswordSchema } from '../../../../features/auth/schemas';
import { getAuthErrorMessage } from '../../../../lib/auth-error-messages';
import { EyeIcon } from '../../../../shared/ui/icons/EyeIcon';
import { EyeOffIcon } from '../../../../shared/ui/icons/EyeOffIcon';
import { SpinnerIcon } from '../../../../shared/ui/icons/SpinnerIcon';
import styles from '../../auth-pages.module.css';

const FALLBACK_ERROR = `We could not reset your password. Please request a new link and try again.`;

export function ResetPasswordConfirmPageClient({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState(``);
  const [confirmPassword, setConfirmPassword] = useState(``);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigatedRef = useRef(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const nextFieldErrors: Record<string, string> = {};
      if (flattened.password?.[0]) nextFieldErrors.password = flattened.password[0];
      if (flattened.confirmPassword?.[0]) nextFieldErrors.confirmPassword = flattened.confirmPassword[0];
      setFieldErrors(nextFieldErrors);
      setError(flattened.password?.[0] ?? flattened.confirmPassword?.[0] ?? `Please fix the highlighted fields.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/consumer/auth/password/reset`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ token, password: parsed.data.password }),
        cache: `no-store`,
      });

      const data = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
      if (!response.ok) {
        if (response.status === 429) {
          setError(AUTH_RATE_LIMIT_MESSAGE);
          return;
        }
        setError(getAuthErrorMessage(data.code ?? data.message, FALLBACK_ERROR));
        return;
      }

      navigatedRef.current = true;
      router.replace(`/login?${AUTH_NOTICE_QUERY}=reset_success`);
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      if (!navigatedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.narrowContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Set new password</h1>
          <p className={styles.subtitle}>Enter your new password below. Use at least 8 characters.</p>
        </div>

        <div className={styles.card}>
          <form className={styles.stack} onSubmit={handleSubmit} noValidate>
            <div>
              <label className={styles.label} htmlFor="reset-password">
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? `text` : `password`}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((current) => {
                        const next = { ...current };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  className={`input w-full pr-12 ${fieldErrors.password ? styles.inputError : ``}`}
                  placeholder="At least 8 characters"
                  aria-invalid={fieldErrors.password ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPassword ? `Hide password` : `Show password`}
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className={styles.errorText} role="alert">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div>
              <label className={styles.label} htmlFor="reset-confirm-password">
                Confirm password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.confirmPassword;
                      return next;
                    });
                  }
                }}
                className={`input w-full ${fieldErrors.confirmPassword ? styles.inputError : ``}`}
                placeholder="Re-enter new password"
                aria-invalid={fieldErrors.confirmPassword ? true : undefined}
              />
              {fieldErrors.confirmPassword ? (
                <p className={styles.errorText} role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            {error ? (
              <div className={styles.errorBanner} role="alert">
                <p className={styles.errorMessage}>{error}</p>
              </div>
            ) : null}

            <button type="submit" className={styles.submitBtn} disabled={loading || !password || !confirmPassword}>
              {loading ? (
                <span className={styles.spinnerRow}>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                `Reset password`
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
