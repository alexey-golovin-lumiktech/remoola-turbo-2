'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AUTH_RATE_LIMIT_MESSAGE,
  AUTH_NOTICE_QUERY,
  buildConsumerGoogleOAuthStartUrl,
  type AuthNotice,
  getAuthNoticeMessage,
  removeStaleLoginParams,
  SESSION_EXPIRED_QUERY,
} from '@remoola/api-types';
import { GoogleIcon, RemoolaCompactLogo, RemoolaLogo } from '@remoola/ui';

import { shouldFinalizeLoginLoading } from './login-loading-guard';
import styles from './LoginForm.module.css';
import { resolveAuthErrorMessage } from '../../../lib/auth-error-messages';
import { getDevCredentials } from '../../../lib/dev-credentials';
import { resetSessionExpiredHandled } from '../../../lib/session-expired';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { EyeIcon } from '../../../shared/ui/icons/EyeIcon';
import { EyeOffIcon } from '../../../shared/ui/icons/EyeOffIcon';
import { LightningIcon } from '../../../shared/ui/icons/LightningIcon';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { XCircleIcon } from '../../../shared/ui/icons/XCircleIcon';
import { XIcon } from '../../../shared/ui/icons/XIcon';
import { resetUserThemeCache } from '../../../shared/ui/ThemeInitializer';
import { loginSchema } from '../schemas';

const CLEAR_COOKIES_URL = `/api/consumer/auth/clear-cookies`;

export function LoginForm({
  nextPath,
  sessionExpired,
  authNotice,
}: {
  nextPath: string;
  sessionExpired?: boolean;
  authNotice?: AuthNotice;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get(`error`);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const devCredentials = getDevCredentials();
  const [email, setEmail] = useState(devCredentials?.email ?? ``);
  const [password, setPassword] = useState(devCredentials?.password ?? ``);
  const [err, setErr] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState(sessionExpired ?? false);
  const [authNoticeMessage] = useState<string | undefined>(authNotice ? getAuthNoticeMessage(authNotice) : undefined);
  const didNavigateRef = useRef(false);

  const errorMessage =
    err ?? (oauthError ? resolveAuthErrorMessage(oauthError, `Sign-in failed. Please try again.`) : undefined);

  const handleGoogleSignIn = useCallback(async () => {
    const url = new URL(buildConsumerGoogleOAuthStartUrl(nextPath), window.location.origin);
    await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
    window.location.href = `${url.pathname}${url.search}`;
  }, [nextPath]);

  useEffect(() => {
    resetSessionExpiredHandled();
    resetUserThemeCache();
  }, []);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const cleanedLoginQueryRef = useRef(false);
  useEffect(() => {
    if (cleanedLoginQueryRef.current) return;

    const hasSessionExpiredFlag =
      searchParams.get(SESSION_EXPIRED_QUERY) === `true` || searchParams.get(SESSION_EXPIRED_QUERY) === `1`;
    const hasAuthNotice = searchParams.get(AUTH_NOTICE_QUERY) != null;
    if (!hasSessionExpiredFlag && !hasAuthNotice) return;

    cleanedLoginQueryRef.current = true;
    const cleanupQueryParams = () => {
      const url = new URL(window.location.href);
      removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY, AUTH_NOTICE_QUERY]);
      window.history.replaceState(null, ``, url.pathname + (url.search || ``));
    };

    if (hasSessionExpiredFlag) {
      fetch(CLEAR_COOKIES_URL, { method: `POST`, credentials: `include` }).finally(cleanupQueryParams);
      return;
    }

    cleanupQueryParams();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    setFieldErrors({});
    setShowSessionExpiredMessage(false);

    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      const msg = errors.email?.[0] ?? errors.password?.[0] ?? `Invalid input`;
      setErr(msg);
      return;
    }

    setLoading(true);
    try {
      const loginRes = await fetch(`/api/login`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify(parsed.data),
      });
      if (!loginRes.ok) {
        const status = loginRes.status;
        if (status === 401) {
          setErr(`Invalid email or password. Please try again.`);
          setFieldErrors({ email: ` `, password: ` ` });
        } else if (status === 429) {
          setErr(AUTH_RATE_LIMIT_MESSAGE);
        } else {
          setErr(`Unable to sign in. Please check your connection and try again.`);
        }
        return;
      }
      didNavigateRef.current = true;
      router.replace(nextPath);
    } catch {
      setErr(`Network error. Please check your connection and try again.`);
    } finally {
      if (shouldFinalizeLoginLoading(didNavigateRef.current)) {
        setLoading(false);
      }
    }
  };

  const isFormValid = email.trim() && password.length >= 1;

  return (
    <div className={styles.root} data-testid="consumer-mobile-login-page">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={`flex md:hidden ${styles.headerTopMobile}`}>
            <RemoolaCompactLogo className={styles.logoImageCompact} />
            <div className={styles.headerCopy}>
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.subtitle}>Sign in to continue to your account</p>
            </div>
          </div>
          <div className={`hidden md:block ${styles.headerTopDesktop}`}>
            <RemoolaLogo className={styles.logoImageDesktop} />
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in to continue to your account</p>
          </div>
          {devCredentials ? (
            <div className={styles.devBadge}>
              <LightningIcon className={styles.devIcon} strokeWidth={2} />
              Dev Mode
            </div>
          ) : null}
        </div>

        {showSessionExpiredMessage ? (
          <div className={styles.sessionAlert} role="alert">
            <div className={styles.sessionInner}>
              <AlertTriangleIcon className={styles.sessionIcon} />
              <div>
                <p className={styles.sessionTitle}>Session expired</p>
                <p className={styles.sessionText}>Your session has expired. Please sign in again to continue.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionExpiredMessage(false)}
                className={styles.dismissBtn}
                aria-label="Dismiss"
              >
                <XIcon className={styles.dismissIcon} />
              </button>
            </div>
          </div>
        ) : null}
        {authNoticeMessage ? (
          <div
            className={styles.noticeAlert}
            role="status"
            aria-live="polite"
            data-testid="consumer-mobile-login-auth-notice"
          >
            <p className={styles.noticeText}>{authNoticeMessage}</p>
          </div>
        ) : null}

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit} data-testid="consumer-mobile-login-form" noValidate>
            <div>
              <label className={styles.label} htmlFor="login-email">
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="login-email"
                className={`input transition-colors ${fieldErrors.email ? styles.inputError : ``}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? `login-email-error` : undefined}
                data-testid="consumer-mobile-login-email"
              />
              {fieldErrors.email ? (
                <p id="login-email-error" className={styles.errorText} role="alert">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div>
              <div className={styles.passwordRow}>
                <label className={styles.label} htmlFor="login-password">
                  Password
                </label>
                <Link href="/forgot-password" prefetch={false} className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
              <div className={styles.passwordWrap}>
                <input
                  id="login-password"
                  className={`input pr-12 transition-colors ${fieldErrors.password ? styles.inputError : ``}`}
                  type={showPassword ? `text` : `password`}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? `login-password-error` : undefined}
                  data-testid="consumer-mobile-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.toggleBtn}
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
                <p id="login-password-error" className={styles.errorText} role="alert">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {errorMessage ? (
              <div className={styles.errorBanner} role="alert" data-testid="consumer-mobile-login-error">
                <div className={styles.errorInner}>
                  <XCircleIcon className={styles.errorIcon} />
                  <p className={styles.errorMessage}>{errorMessage}</p>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !isFormValid}
              data-testid="consumer-mobile-login-submit"
            >
              {loading ? (
                <span className={styles.submitLoading}>
                  <SpinnerIcon className={styles.spinnerIcon} />
                  Signing in…
                </span>
              ) : (
                `Sign in`
              )}
            </button>

            <>
              <div className={styles.dividerWrap}>
                <div className={styles.dividerLine}>
                  <div className={styles.dividerLineInner} />
                </div>
                <div className={styles.dividerTextWrap}>
                  <span className={styles.dividerText}>Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={styles.googleBtn}
                data-testid="consumer-mobile-login-google"
              >
                <span className={styles.googleInner}>
                  <GoogleIcon size={20} />
                  Continue with Google
                </span>
              </button>
            </>
          </form>
        </div>

        <p className={styles.footer}>
          Don&apos;t have an account?{` `}
          <Link
            href="/signup/start"
            prefetch={false}
            className={styles.signupLink}
            data-testid="consumer-mobile-login-signup-link"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
