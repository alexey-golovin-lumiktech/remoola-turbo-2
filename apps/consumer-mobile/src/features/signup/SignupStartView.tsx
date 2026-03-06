'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ACCOUNT_TYPE, type TAccountType } from '@remoola/api-types';
import { ClipboardIcon, UserIcon } from '@remoola/ui';

import { useSignupForm } from './SignupFormContext';
import { InformationCircleIcon } from '../../shared/ui/icons/InformationCircleIcon';

export function SignupStartView() {
  const router = useRouter();
  const params = useSearchParams();
  const { signupDetails, updateSignup, updatePersonal, googleSignupToken, setGoogleSignupToken } = useSignupForm();
  const googleSignupTokenFromUrl = params.get(`googleSignupToken`);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const hydratedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!googleSignupTokenFromUrl) {
      void fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
      return;
    }
  }, [googleSignupTokenFromUrl]);

  useEffect(() => {
    if (!googleSignupTokenFromUrl || hydratedRef.current) return;

    hydratedRef.current = true;
    setGoogleSignupToken(googleSignupTokenFromUrl);
    setHydrateError(null);

    const hydrateFromGoogle = async () => {
      let fetchedEmail: string | undefined;
      let fetchedGivenName: string | undefined;
      let fetchedFamilyName: string | undefined;
      let failed = false;
      try {
        const res = await fetch(
          `/api/consumer/auth/google/signup-session?token=${encodeURIComponent(googleSignupTokenFromUrl)}`,
          { credentials: `include` },
        );
        if (res.ok && isMountedRef.current) {
          const data = (await res.json().catch(() => ({}))) as {
            email?: string;
            givenName?: string;
            familyName?: string;
          };
          fetchedEmail = data?.email;
          fetchedGivenName = data?.givenName;
          fetchedFamilyName = data?.familyName;
        } else if (isMountedRef.current) {
          failed = true;
          const msg = `Could not load your Google signup session. Please try again.`;
          setHydrateError(msg);
        }
      } catch {
        if (isMountedRef.current) {
          failed = true;
          const msg = `Could not load your Google signup session. Please check your connection and try again.`;
          setHydrateError(msg);
        }
      } finally {
        if (isMountedRef.current && !failed) {
          updateSignup({
            accountType: ACCOUNT_TYPE.CONTRACTOR,
            ...(fetchedEmail ? { email: fetchedEmail } : {}),
          });
          if (fetchedGivenName || fetchedFamilyName) {
            updatePersonal({
              ...(fetchedGivenName ? { firstName: fetchedGivenName } : {}),
              ...(fetchedFamilyName ? { lastName: fetchedFamilyName } : {}),
            });
          }
        }
      }
    };
    hydrateFromGoogle();
  }, [googleSignupTokenFromUrl, setGoogleSignupToken, updateSignup, updatePersonal, retryTrigger]);

  const selectType = (type: TAccountType) => {
    updateSignup({ accountType: type });
  };

  const onNext = () => {
    if (!signupDetails.accountType) return;
    if (signupDetails.accountType === ACCOUNT_TYPE.BUSINESS) {
      const q = googleSignupToken ? `?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : ``;
      router.push(`/signup${q}`);
    } else {
      const q = googleSignupToken ? `?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : ``;
      router.push(`/signup/start/contractor-kind${q}`);
    }
  };

  const isSelected = (type: TAccountType) => signupDetails.accountType === type;

  useEffect(() => {
    if (signupDetails.accountType === null) {
      updateSignup({ accountType: ACCOUNT_TYPE.CONTRACTOR });
    }
  }, [signupDetails.accountType, updateSignup]);

  return (
    <div
      className={`
      mx-auto
      max-w-md
      space-y-6
      px-3
      py-4
      sm:px-4
    `}
      data-testid="consumer-signup-start-page"
    >
      <div className={`text-center`}>
        <h1
          className={`
          text-2xl
          font-bold
          text-neutral-900
          dark:text-white
        `}
        >
          Welcome to Remoola
        </h1>
        <p
          className={`
          mt-2
          text-sm
          text-neutral-600
          dark:text-neutral-400
        `}
        >
          Let&apos;s get started by setting up your account
        </p>
      </div>

      {hydrateError && (
        <div
          className={`
          rounded-lg
          border
          border-red-200
          bg-red-50
          p-4
          dark:border-red-900/50
          dark:bg-red-900/20
        `}
        >
          <div className={`flex items-start gap-3`}>
            <svg
              className={`
                mt-0.5
                h-5
                w-5
                shrink-0
                text-red-600
                dark:text-red-400
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className={`flex-1`}>
              <p
                className={`
                text-sm
                font-semibold
                text-red-900
                dark:text-red-200
              `}
              >
                {hydrateError}
              </p>
              <button
                type="button"
                onClick={() => {
                  hydratedRef.current = false;
                  setRetryTrigger((t) => t + 1);
                }}
                className={`
                  mt-2
                  text-sm
                  font-medium
                  text-red-700
                  hover:text-red-800
                  dark:text-red-300
                  dark:hover:text-red-200
                `}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`
        rounded-2xl
        border
        border-neutral-200
        bg-white
        p-6
        shadow-sm
        dark:border-neutral-700
        dark:bg-neutral-900
      `}
      >
        {googleSignupTokenFromUrl && signupDetails.email && (
          <div
            className={`
            mb-4
            rounded-lg
            bg-primary-50
            p-3
            dark:bg-primary-900/20
          `}
          >
            <p
              className={`
              flex
              items-center
              gap-2
              text-sm
              text-primary-700
              dark:text-primary-300
            `}
            >
              <InformationCircleIcon className={`h-5 w-5 shrink-0`} />
              Signing up with {signupDetails.email}
            </p>
          </div>
        )}
        <div className={`mb-6`}>
          <p
            className={`
            text-sm
            font-medium
            text-neutral-500
            dark:text-neutral-400
          `}
          >
            Step 1 of 4
          </p>
          <h2
            className={`
            mt-1
            text-xl
            font-semibold
            text-neutral-900
            dark:text-white
          `}
          >
            Choose your account type
          </h2>
          <p
            className={`
            mt-1
            text-sm
            text-neutral-600
            dark:text-neutral-400
          `}
          >
            Select the option that best describes you
          </p>
        </div>

        <div className={`space-y-3`} data-testid="consumer-signup-start-options">
          <button
            type="button"
            data-testid="consumer-signup-start-option-contractor"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectType(ACCOUNT_TYPE.CONTRACTOR);
            }}
            className={`group relative flex min-h-[72px] w-full items-center gap-4 overflow-hidden rounded-xl border-2 px-5 py-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSelected(ACCOUNT_TYPE.CONTRACTOR)
                ? `border-primary-500 bg-primary-50 shadow-md dark:border-primary-400 dark:bg-primary-900/20`
                : `border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500`
            }`}
          >
            {isSelected(ACCOUNT_TYPE.CONTRACTOR) && (
              <div
                className={`
                absolute
                inset-0
                bg-gradient-to-br
                from-primary-500/5
                to-transparent
              `}
              />
            )}
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                isSelected(ACCOUNT_TYPE.CONTRACTOR)
                  ? `bg-primary-600 text-white shadow-lg dark:bg-primary-500`
                  : `bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400`
              }`}
            >
              <UserIcon size={24} />
            </div>
            <div className={`relative flex-1`}>
              <div className={`flex items-center gap-2`}>
                <span
                  className={`text-lg font-semibold ${
                    isSelected(ACCOUNT_TYPE.CONTRACTOR)
                      ? `text-primary-700 dark:text-primary-300`
                      : `text-neutral-700 dark:text-neutral-200`
                  }`}
                >
                  Contractor
                </span>
                {isSelected(ACCOUNT_TYPE.CONTRACTOR) && (
                  <svg
                    className={`
                      h-5
                      w-5
                      text-primary-600
                      dark:text-primary-400
                    `}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p
                className={`
                mt-0.5
                text-sm
                text-neutral-600
                dark:text-neutral-400
              `}
              >
                For freelancers and independent workers
              </p>
            </div>
          </button>

          <button
            type="button"
            data-testid="consumer-signup-start-option-business"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectType(ACCOUNT_TYPE.BUSINESS);
            }}
            className={`group relative flex min-h-[72px] w-full items-center gap-4 overflow-hidden rounded-xl border-2 px-5 py-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSelected(ACCOUNT_TYPE.BUSINESS)
                ? `border-primary-500 bg-primary-50 shadow-md dark:border-primary-400 dark:bg-primary-900/20`
                : `border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500`
            }`}
          >
            {isSelected(ACCOUNT_TYPE.BUSINESS) && (
              <div
                className={`
                absolute
                inset-0
                bg-gradient-to-br
                from-primary-500/5
                to-transparent
              `}
              />
            )}
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                isSelected(ACCOUNT_TYPE.BUSINESS)
                  ? `bg-primary-600 text-white shadow-lg dark:bg-primary-500`
                  : `bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400`
              }`}
            >
              <ClipboardIcon size={24} />
            </div>
            <div className={`relative flex-1`}>
              <div className={`flex items-center gap-2`}>
                <span
                  className={`text-lg font-semibold ${
                    isSelected(ACCOUNT_TYPE.BUSINESS)
                      ? `text-primary-700 dark:text-primary-300`
                      : `text-neutral-700 dark:text-neutral-200`
                  }`}
                >
                  Business
                </span>
                {isSelected(ACCOUNT_TYPE.BUSINESS) && (
                  <svg
                    className={`
                      h-5
                      w-5
                      text-primary-600
                      dark:text-primary-400
                    `}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p
                className={`
                mt-0.5
                text-sm
                text-neutral-600
                dark:text-neutral-400
              `}
              >
                For companies and organizations
              </p>
            </div>
          </button>
        </div>

        <button
          type="button"
          data-testid="consumer-signup-start-btn-next"
          disabled={!signupDetails.accountType}
          onClick={onNext}
          className={
            `mt-6 min-h-[48px] w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all ` +
            `hover:bg-primary-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ` +
            `disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-600 disabled:hover:shadow-sm`
          }
        >
          Continue
        </button>
      </div>

      <p
        className={`
        text-center
        text-sm
        text-neutral-600
        dark:text-neutral-400
      `}
      >
        Already have an account?{` `}
        <a
          href="/login"
          className={`
            font-semibold
            text-primary-600
            hover:text-primary-700
            dark:text-primary-400
            dark:hover:text-primary-300
          `}
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
