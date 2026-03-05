'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GoogleIcon } from '@remoola/ui';

import { getApiBaseUrlOptional } from '../../../lib/config.client';
import { getDevCredentials } from '../../../lib/dev-credentials';
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
      className="
        flex
        min-h-screen
        flex-col
        items-center
        px-4
        py-8
        sm:justify-center
        sm:px-6
      "
      data-testid="consumer-mobile-login-page"
    >
      <div
        className="
          w-full
          max-w-sm
        "
      >
        <div
          className="
            mb-8
            text-center
          "
        >
          <h1
            className="
              text-2xl
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            Welcome back
          </h1>
          <p
            className="
              mt-2
              text-sm
              text-slate-600
              dark:text-slate-400
            "
          >
            Sign in to continue to your account
          </p>
          {devCredentials && (
            <div
              className="
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
              "
            >
              <svg
                className="
                  h-3.5
                  w-3.5
                "
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Dev Mode
            </div>
          )}
        </div>

        {showSessionExpiredMessage && (
          <div
            className="
              mb-6
              animate-fadeIn
              rounded-lg
              border
              border-amber-200
              bg-amber-50
              p-4
              dark:border-amber-900/50
              dark:bg-amber-900/20
            "
            role="alert"
          >
            <div
              className="
                flex
                items-start
                gap-3
              "
            >
              <svg
                className="
                  mt-0.5
                  h-5
                  w-5
                  shrink-0
                  text-amber-600
                  dark:text-amber-400
                "
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-amber-900
                    dark:text-amber-200
                  "
                >
                  Session expired
                </p>
                <p
                  className="
                    mt-1
                    text-sm
                    text-amber-700
                    dark:text-amber-300
                  "
                >
                  Your session has expired. Please sign in again to continue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionExpiredMessage(false)}
                className="
                  ml-auto
                  shrink-0
                  text-amber-600
                  hover:text-amber-800
                  dark:text-amber-400
                  dark:hover:text-amber-200
                "
                aria-label="Dismiss"
              >
                <svg
                  className="
                    h-5
                    w-5
                  "
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-6
            shadow-sm
            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          <form
            className="
              space-y-5
            "
            onSubmit={handleSubmit}
            data-testid="consumer-mobile-login-form"
            noValidate
          >
            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                  text-slate-700
                  dark:text-slate-300
                "
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
                  className="
                    mt-1.5
                    text-xs
                    text-red-600
                    dark:text-red-400
                  "
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div
                className="
                  mb-2
                  flex
                  items-center
                  justify-between
                "
              >
                <label
                  className="
                    text-sm
                    font-medium
                    text-slate-700
                    dark:text-slate-300
                  "
                  htmlFor="login-password"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="
                    text-xs
                    font-medium
                    text-primary-600
                    hover:text-primary-700
                    dark:text-primary-400
                  "
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div
                className="
                  relative
                "
              >
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
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                    hover:text-slate-600
                    dark:hover:text-slate-300
                  "
                  tabIndex={-1}
                  aria-label={showPassword ? `Hide password` : `Show password`}
                >
                  {showPassword ? (
                    <svg
                      className="
                        h-5
                        w-5
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="
                        h-5
                        w-5
                      "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  id="login-password-error"
                  className="
                    mt-1.5
                    text-xs
                    text-red-600
                    dark:text-red-400
                  "
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {errorMessage && (
              <div
                className="
                  animate-fadeIn
                  rounded-lg
                  bg-red-50
                  p-3
                  dark:bg-red-900/20
                "
                role="alert"
                data-testid="consumer-mobile-login-error"
              >
                <div
                  className="
                    flex
                  "
                >
                  <svg
                    className="
                      h-5
                      w-5
                      shrink-0
                      text-red-400
                    "
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p
                    className="
                      ml-3
                      text-sm
                      text-red-700
                      dark:text-red-300
                    "
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
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <svg
                    className="
                      h-4
                      w-4
                      animate-spin
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="
                        opacity-25
                      "
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="
                        opacity-75
                      "
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                `Sign in`
              )}
            </button>

            {googleStartUrl && (
              <>
                <div
                  className="
                    relative
                    my-5
                  "
                >
                  <div
                    className="
                      absolute
                      inset-0
                      flex
                      items-center
                    "
                  >
                    <div
                      className="
                        w-full
                        border-t
                        border-slate-200
                        dark:border-slate-700
                      "
                    />
                  </div>
                  <div
                    className="
                      relative
                      flex
                      justify-center
                      text-xs
                    "
                  >
                    <span
                      className="
                        bg-white
                        px-3
                        text-slate-500
                        dark:bg-slate-900
                        dark:text-slate-400
                      "
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
                    className="
                      flex
                      items-center
                      justify-center
                      gap-3
                    "
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
          className="
            mt-6
            text-center
            text-sm
            text-slate-600
            dark:text-slate-400
          "
        >
          Don&apos;t have an account?{` `}
          <Link
            href="/signup/start"
            className="
              font-semibold
              text-primary-600
              hover:text-primary-700
              dark:text-primary-400
              dark:hover:text-primary-300
            "
            data-testid="consumer-mobile-login-signup-link"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
