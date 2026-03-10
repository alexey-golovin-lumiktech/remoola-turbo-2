'use client';

import Link from 'next/link';

import { CheckCircleIcon } from '@remoola/ui';

export function CompletedView() {
  return (
    <div
      className={`
        mx-auto
        max-w-md
        space-y-4
        px-3
        py-4
        text-center
        sm:space-y-6
        sm:px-4
      `}
      data-testid="consumer-signup-completed-page"
    >
      <div
        className={`
        rounded-xl
        border
        border-neutral-200
        bg-white
        p-5
        shadow-xs
        sm:p-8
        dark:border-neutral-700
        dark:bg-neutral-900
      `}
      >
        <div
          className={`
          mx-auto
          mb-4
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-full
          bg-green-100
          dark:bg-green-900/30
        `}
        >
          <CheckCircleIcon size={36} className={`text-green-600 dark:text-green-400`} />
        </div>
        <h1
          className={`
          text-xl
          font-semibold
          text-neutral-900
          dark:text-white
        `}
        >
          Sign up successful
        </h1>
        <h2 className={`mt-1 text-neutral-600 dark:text-neutral-400`}>
          Welcome to <span className={`font-semibold text-neutral-900 dark:text-white`}>Remoola</span>
        </h2>
        <p
          className={`
          mt-4
          text-sm
          leading-relaxed
          text-neutral-500
          dark:text-neutral-400
        `}
        >
          We have sent you an email to confirm your email and activate your account. Check your email and come back
          soon.
        </p>
        <Link
          href="/login"
          className={`
            mt-6
            inline-block
            min-h-11
            w-full
            rounded-xl
            bg-primary-600
            px-4
            py-3
            font-semibold
            text-white
            hover:bg-primary-700
            focus:outline-hidden
            focus:ring-2
            focus:ring-primary-500
            focus:ring-offset-2
            dark:bg-primary-500
            dark:hover:bg-primary-600
          `}
          data-testid="consumer-signup-completed-link-login"
        >
          Click to Sign In
        </Link>
      </div>
    </div>
  );
}
