'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { GoogleIcon } from '../../components/ui';
import styles from '../../components/ui/classNames.module.css';

const {
  formInputFullWidth,
  inlineFlexItemsCenterGap2,
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

  // read ?next=... from URL, fallback to /dashboard
  const rawNext = searchParams.get(`next`);
  const nextPath = rawNext && rawNext.length > 0 ? decodeURIComponent(rawNext) : `/dashboard`;
  const oauthError = searchParams.get(`error`);

  const [email, setEmail] = useState(`user@example.com`);
  const [password, setPassword] = useState(`password`);
  const [err, setErr] = useState<string>();
  const errorMessage = err || (oauthError ? `Google sign-in failed. Please try again.` : undefined);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const googleStartUrl =
    apiBaseUrl != null && apiBaseUrl.length > 0
      ? `${apiBaseUrl}/consumer/auth/google/start?next=${encodeURIComponent(nextPath)}`
      : null;

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);

    const loginRequest = await fetch(`/api/login`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({ email, password }),
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

    // ✅ redirect to ?next=... or /dashboard
    router.replace(nextPath || `/dashboard`);
  };

  return (
    <div className={loginContainer}>
      <h1 className={loginTitle}>Sign in</h1>
      <form className={loginForm} onSubmit={submitLogin}>
        <input
          className={formInputFullWidth}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className={formInputFullWidth}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {errorMessage && <p className={loginErrorText}>{errorMessage}</p>}
        <button className={loginButton}>Login</button>
        {googleStartUrl && (
          <button
            type="button"
            className={loginButton}
            onClick={async () => {
              await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
              window.location.href = googleStartUrl;
            }}
          >
            <span className={inlineFlexItemsCenterGap2}>
              <GoogleIcon size={20} />
              Continue with Google
            </span>
          </button>
        )}
      </form>

      <p className={loginFooter}>
        Need to create an account?{` `}
        <Link href="/signup" className={linkPrimary}>
          Sign Up
        </Link>
      </p>
    </div>
  );
}
