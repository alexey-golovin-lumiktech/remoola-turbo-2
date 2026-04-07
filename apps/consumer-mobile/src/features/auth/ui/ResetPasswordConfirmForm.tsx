'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { AUTH_NOTICE_QUERY, AUTH_RATE_LIMIT_MESSAGE } from '@remoola/api-types';

import styles from './LoginForm.module.css';
import { shouldFinalizeResetConfirmLoading } from './reset-confirm-loading';
import { getErrorMessageForUser } from '../../../lib/error-messages';
import { EyeIcon } from '../../../shared/ui/icons/EyeIcon';
import { EyeOffIcon } from '../../../shared/ui/icons/EyeOffIcon';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { resetPasswordSchema } from '../schemas';

const FALLBACK_ERROR = `Something went wrong. Please try again or request a new reset link.`;

export function ResetPasswordConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get(`token`);

  const [password, setPassword] = useState(``);
  const [confirmPassword, setConfirmPassword] = useState(``);
  const [err, setErr] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const didNavigateRef = useRef(false);

  if (!token || token.trim() === ``) {
    return (
      <div className={styles.root} data-testid="consumer-mobile-reset-password-page">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Invalid or missing link</h1>
            <p className={styles.subtitle}>This reset link is invalid or has expired. Request a new one below.</p>
          </div>
          <div className={styles.card}>
            <Link href="/forgot-password" prefetch={false} className={styles.signupLink}>
              Request a new reset link
            </Link>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const fields: Record<string, string> = {};
      if (errors.password?.[0]) fields.password = errors.password[0];
      if (errors.confirmPassword?.[0]) fields.confirmPassword = errors.confirmPassword[0];
      setFieldErrors(fields);
      setErr(errors.password?.[0] ?? errors.confirmPassword?.[0] ?? `Invalid input`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/consumer/auth/password/reset`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({ token: token.trim(), password: parsed.data.password }),
        cache: `no-store`,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          setErr(AUTH_RATE_LIMIT_MESSAGE);
          return;
        }
        const code = data?.code ?? data?.message;
        setErr(getErrorMessageForUser(code, FALLBACK_ERROR));
        return;
      }
      didNavigateRef.current = true;
      router.replace(`/login?${AUTH_NOTICE_QUERY}=reset_success`);
    } catch {
      setErr(FALLBACK_ERROR);
    } finally {
      if (shouldFinalizeResetConfirmLoading(didNavigateRef.current)) {
        setLoading(false);
      }
    }
  };

  return (
    <div className={styles.root} data-testid="consumer-mobile-reset-password-page">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Set new password</h1>
          <p className={styles.subtitle}>Enter your new password below. Use at least 8 characters.</p>
        </div>

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div>
              <label className={styles.label} htmlFor="reset-password">
                New password
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="reset-password"
                  type={showPassword ? `text` : `password`}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                  }}
                  placeholder="At least 8 characters"
                  className={`input w-full pr-12 ${fieldErrors.password ? styles.inputError : ``}`}
                  aria-invalid={!!fieldErrors.password}
                  data-testid="consumer-mobile-reset-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.toggleBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? `Hide password` : `Show password`}
                >
                  {showPassword ? (
                    <EyeOffIcon className={styles.toggleIcon} />
                  ) : (
                    <EyeIcon className={styles.toggleIcon} />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className={styles.errorText} role="alert">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div>
              <label className={styles.label} htmlFor="reset-confirm">
                Confirm password
              </label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.confirmPassword;
                      return next;
                    });
                }}
                placeholder="Re-enter new password"
                className={`input w-full ${fieldErrors.confirmPassword ? styles.inputError : ``}`}
                aria-invalid={!!fieldErrors.confirmPassword}
                data-testid="consumer-mobile-reset-password-confirm"
              />
              {fieldErrors.confirmPassword ? (
                <p className={styles.errorText} role="alert">
                  {fieldErrors.confirmPassword}
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
              disabled={loading || !password || !confirmPassword}
              data-testid="consumer-mobile-reset-password-submit"
            >
              {loading ? (
                <span className={styles.submitLoading}>
                  <SpinnerIcon className={styles.spinnerIcon} />
                  Reset password
                </span>
              ) : (
                `Reset password`
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
