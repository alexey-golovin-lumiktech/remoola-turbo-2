'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GoogleIcon } from '@remoola/ui';

import { getApiBaseUrlOptional } from '../../../lib/config.client';
import { getDevCredentials } from '../../../lib/dev-credentials';
import { AlertTriangleIcon } from '../../../shared/ui/icons/AlertTriangleIcon';
import { EyeIcon } from '../../../shared/ui/icons/EyeIcon';
import { EyeOffIcon } from '../../../shared/ui/icons/EyeOffIcon';
import { LightningIcon } from '../../../shared/ui/icons/LightningIcon';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { XCircleIcon } from '../../../shared/ui/icons/XCircleIcon';
import { XIcon } from '../../../shared/ui/icons/XIcon';
import { loginSchema } from '../schemas';

export function LoginForm({ nextPath, sessionExpired }: { nextPath: string; sessionExpired?: boolean }) {
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

  const errorMessage = err ?? (oauthError ? `Sign-in failed. Please try again.` : undefined);

  const googleStartUrl = useMemo(() => {
    const base = getApiBaseUrlOptional();
    if (!base) return null;
    if (typeof window === `undefined`) return null;
    const url = new URL(`${base}/consumer/auth/google/start`);
    url.searchParams.set(`next`, encodeURIComponent(nextPath));
    url.searchParams.set(`returnOrigin`, window.location.origin);
    return url.toString();
  }, [nextPath]);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

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
          setErr(`Too many attempts. Please wait a few minutes and try again.`);
        } else {
          setErr(`Unable to sign in. Please check your connection and try again.`);
        }
        return;
      }
      const meRes = await fetch(`/api/me`, {
        method: `GET`,
        credentials: `include`,
        cache: `no-store`,
      });
      if (!meRes.ok) {
        setErr(`Session could not be established. Please try again.`);
        return;
      }
      router.replace(nextPath);
    } catch {
      setErr(`Network error. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() && password.length >= 1;

  return (
    <div
      className={`
  flex
  min-h-screen
  flex-col
  items-center
  px-4
  py-8
  sm:justify-center
  sm:px-6
      `}
      data-testid="consumer-mobile-login-page"
    >
      <div className={`w-full max-w-sm`}>
        <div className={`mb-8 text-center`}>
          <h1
            className={`
  text-2xl
  font-bold
  text-slate-900
  dark:text-white
            `}
          >
            Welcome back
          </h1>
          <p
            className={`
  mt-2
  text-sm
  text-slate-600
  dark:text-slate-400
            `}
          >
            Sign in to continue to your account
          </p>
          {devCredentials && (
            <div
              className={`
  mt-4
  inline-flex
  items-center
  gap-1.5
  rounded-full
  border
  border-amber-200
  bg-amber-50
  px-3
  py-1.5
  text-xs
  font-medium
  text-amber-700
  dark:border-amber-900/50
  dark:bg-amber-900/20
  dark:text-amber-300
              `}
            >
              <LightningIcon className={`h-3.5 w-3.5`} strokeWidth={2} />
              Dev Mode
            </div>
          )}
        </div>

        {showSessionExpiredMessage && (
          <div
            className={`
  mb-6
  animate-fadeIn
  rounded-lg
  border
  border-amber-200
  bg-amber-50
  p-4
  dark:border-amber-900/50
  dark:bg-amber-900/20
            `}
            role="alert"
          >
            <div className={`flex items-start gap-3`}>
              <AlertTriangleIcon
                className={`
  mt-0.5
  h-5
  w-5
  shrink-0
  text-amber-600
  dark:text-amber-400
              `}
              />
              <div>
                <p
                  className={`
  text-sm
  font-semibold
  text-amber-900
  dark:text-amber-200
                  `}
                >
                  Session expired
                </p>
                <p
                  className={`
  mt-1
  text-sm
  text-amber-700
  dark:text-amber-300
                  `}
                >
                  Your session has expired. Please sign in again to continue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionExpiredMessage(false)}
                className={`
  ml-auto
  shrink-0
  text-amber-600
  hover:text-amber-800
  dark:text-amber-400
  dark:hover:text-amber-200
                `}
                aria-label="Dismiss"
              >
                <XIcon className={`h-5 w-5`} />
              </button>
            </div>
          </div>
        )}

        <div
          className={`
  rounded-2xl
  border
  border-slate-200
  bg-white
  p-6
  shadow-sm
  dark:border-slate-700
  dark:bg-slate-900
          `}
        >
          <form className={`space-y-5`} onSubmit={handleSubmit} data-testid="consumer-mobile-login-form" noValidate>
            <div>
              <label
                className={`
  mb-2
  block
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                `}
                htmlFor="login-email"
              >
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="login-email"
                className={`input transition-colors ${fieldErrors.email ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
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
              {fieldErrors.email && (
                <p
                  id="login-email-error"
                  className={`
  mt-1.5
  text-xs
  text-red-600
  dark:text-red-400
                  `}
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div
                className={`
  mb-2
  flex
  items-center
  justify-between
                `}
              >
                <label
                  className={`
  text-sm
  font-medium
  text-slate-700
  dark:text-slate-300
                  `}
                  htmlFor="login-password"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className={`
  text-xs
  font-medium
  text-primary-600
  hover:text-primary-700
  dark:text-primary-400
                  `}
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className={`relative`}>
                <input
                  id="login-password"
                  className={`input pr-12 transition-colors ${fieldErrors.password ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
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
                  className={`
  absolute
  right-3
  top-1/2
  -translate-y-1/2
  text-slate-400
  hover:text-slate-600
  dark:hover:text-slate-300
                  `}
                  tabIndex={-1}
                  aria-label={showPassword ? `Hide password` : `Show password`}
                >
                  {showPassword ? <EyeOffIcon className={`h-5 w-5`} /> : <EyeIcon className={`h-5 w-5`} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  id="login-password-error"
                  className={`
  mt-1.5
  text-xs
  text-red-600
  dark:text-red-400
                  `}
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {errorMessage && (
              <div
                className={`
  animate-fadeIn
  rounded-lg
  bg-red-50
  p-3
  dark:bg-red-900/20
                `}
                role="alert"
                data-testid="consumer-mobile-login-error"
              >
                <div className={`flex`}>
                  <XCircleIcon
                    className={`
  h-5
  w-5
  shrink-0
  text-red-400
                  `}
                  />
                  <p
                    className={`
  ml-3
  text-sm
  text-red-700
  dark:text-red-300
                    `}
                  >
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={
                `group relative min-h-[48px] w-full overflow-hidden rounded-xl bg-primary-600 px-4 py-3 ` +
                `text-sm font-semibold text-white shadow-sm transition-all ` +
                `hover:bg-primary-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ` +
                `disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary-600 disabled:hover:shadow-sm`
              }
              disabled={loading || !isFormValid}
              data-testid="consumer-mobile-login-submit"
            >
              {loading ? (
                <span
                  className={`
  flex
  items-center
  justify-center
  gap-2
                  `}
                >
                  <SpinnerIcon className={`h-4 w-4 animate-spin`} />
                  Signing in…
                </span>
              ) : (
                `Sign in`
              )}
            </button>

            {googleStartUrl && (
              <>
                <div className={`relative my-5`}>
                  <div
                    className={`
  absolute
  inset-0
  flex
  items-center
                    `}
                  >
                    <div
                      className={`
  w-full
  border-t
  border-slate-200
  dark:border-slate-700
                      `}
                    />
                  </div>
                  <div
                    className={`
  relative
  flex
  justify-center
  text-xs
                    `}
                  >
                    <span
                      className={`
  bg-white
  px-3
  text-slate-500
  dark:bg-slate-900
  dark:text-slate-400
                      `}
                    >
                      Or continue with
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
                    window.location.href = googleStartUrl;
                  }}
                  disabled={loading}
                  className={
                    `group relative min-h-[48px] w-full overflow-hidden rounded-xl border border-slate-200 ` +
                    `bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all ` +
                    `hover:border-slate-300 hover:bg-slate-50 hover:shadow-md ` +
                    `focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ` +
                    `disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:shadow-sm ` +
                    `dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700`
                  }
                  data-testid="consumer-mobile-login-google"
                >
                  <span
                    className={`
  flex
  items-center
  justify-center
  gap-3
                    `}
                  >
                    <GoogleIcon size={20} />
                    Continue with Google
                  </span>
                </button>
              </>
            )}
          </form>
        </div>

        <p
          className={`
  mt-6
  text-center
  text-sm
  text-slate-600
  dark:text-slate-400
          `}
        >
          Don&apos;t have an account?{` `}
          <Link
            href="/signup/start"
            className={`
  font-semibold
  text-primary-600
  hover:text-primary-700
  dark:text-primary-400
  dark:hover:text-primary-300
            `}
            data-testid="consumer-mobile-login-signup-link"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
