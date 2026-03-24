'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  AUTH_NOTICE_QUERY,
  emailSchema,
  getAuthNoticeMessage,
  parseAuthNotice,
  removeStaleLoginParams,
  sanitizeNextForRedirect,
  SESSION_EXPIRED_QUERY,
} from '@remoola/api-types';
import { GoogleIcon } from '@remoola/ui';

import { shouldFinalizeLoginLoading } from './login-loading-guard';
import localStyles from './LoginForm.module.css';
import styles from '../../components/ui/classNames.module.css';
import { resetSessionExpiredHandled } from '../../lib/session-expired';

const CLEAR_COOKIES_URL = `/api/consumer/auth/clear-cookies`;
const DEFAULT_NEXT_PATH = `/dashboard`;

const {
  formInputFullWidth,
  linkPrimary,
  loginButton,
  loginContainer,
  loginErrorText,
  loginFooter,
  loginForm,
  loginTitle,
} = styles;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    resetSessionExpiredHandled();
  }, []);

  const cleanedLoginQueryRef = useRef(false);
  useEffect(() => {
    if (cleanedLoginQueryRef.current) return;

    const hasSessionExpiredFlag = searchParams.get(SESSION_EXPIRED_QUERY) === `1`;
    const authNotice = parseAuthNotice(searchParams.get(AUTH_NOTICE_QUERY));
    if (!hasSessionExpiredFlag && !authNotice) return;

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

  // read ?next=... from URL, fallback to /dashboard
  const rawNext = searchParams.get(`next`);
  const nextPath = sanitizeNextForRedirect(rawNext, DEFAULT_NEXT_PATH);
  const oauthError = searchParams.get(`error`);
  const authNotice = parseAuthNotice(searchParams.get(AUTH_NOTICE_QUERY));
  const authNoticeMessage = authNotice ? getAuthNoticeMessage(authNotice) : undefined;

  const [email, setEmail] = useState(`user@example.com`);
  const [password, setPassword] = useState(`password`);
  const [err, setErr] = useState<string>();
  const [loading, setLoading] = useState(false);
  const didNavigateRef = useRef(false);
  const errorMessage = err || (oauthError ? `Google sign-in failed. Please try again.` : undefined);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const googleStartUrl =
    apiBaseUrl != null && apiBaseUrl.length > 0
      ? `${apiBaseUrl}/consumer/auth/google/start?next=${encodeURIComponent(nextPath)}`
      : null;

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    if (!email.trim() || !password.trim()) {
      setErr(`Email and password are required.`);
      return;
    }
    const emailParsed = emailSchema.safeParse(email.trim());
    if (!emailParsed.success) {
      setErr(emailParsed.error.issues[0]?.message ?? `Enter a valid email address`);
      return;
    }

    setLoading(true);
    try {
      const loginRequest = await fetch(`/api/login`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ email: emailParsed.data, password }),
      });

      if (!loginRequest.ok) {
        setErr(`Login failed (${loginRequest.status})`);
        return;
      }

      const meRequest = await fetch(`/api/me`, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
      });

      if (!meRequest.ok) {
        setErr(`Logged in, but cookies not available. Check CORS/cookie attrs.`);
        return;
      }

      didNavigateRef.current = true;
      router.replace(nextPath || `/dashboard`);
    } finally {
      if (shouldFinalizeLoginLoading(didNavigateRef.current)) {
        setLoading(false);
      }
    }
  };

  return (
    <div className={loginContainer} data-testid="consumer-login-page">
      <h1 className={loginTitle}>Sign in</h1>
      {authNoticeMessage ? (
        <div
          className={localStyles.authNotice}
          role="status"
          aria-live="polite"
          data-testid="consumer-login-auth-notice"
        >
          {authNoticeMessage}
        </div>
      ) : null}
      <form className={loginForm} onSubmit={submitLogin} data-testid="consumer-login-form">
        <input
          className={formInputFullWidth}
          data-testid="consumer-login-input-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className={formInputFullWidth}
          type="password"
          data-testid="consumer-login-input-password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <p className={localStyles.forgotPasswordRow}>
          <Link href="/forgot-password" className={linkPrimary} data-testid="consumer-login-link-forgot-password">
            Forgot password?
          </Link>
        </p>
        {errorMessage && (
          <p className={loginErrorText} data-testid="consumer-login-error" role="alert">
            {errorMessage}
          </p>
        )}
        <button className={loginButton} type="submit" data-testid="consumer-login-btn-submit" disabled={loading}>
          {loading ? `Signing in...` : `Login`}
        </button>
        {googleStartUrl && (
          <button
            type="button"
            className={loginButton}
            data-testid="consumer-login-btn-google"
            disabled={loading}
            onClick={async () => {
              await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
              window.location.href = googleStartUrl;
            }}
          >
            <span className={localStyles.authProviderButtonContent}>
              <GoogleIcon size={20} />
              Continue with Google
            </span>
          </button>
        )}
      </form>

      <p className={loginFooter}>
        Need to create an account?{` `}
        <Link href="/signup" className={linkPrimary} data-testid="consumer-login-link-signup">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
