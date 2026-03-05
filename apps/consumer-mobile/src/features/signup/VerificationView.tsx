'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function VerificationView() {
  const searchParams = useSearchParams();
  const email = searchParams.get(`email`);
  const verified = searchParams.get(`verified`);
  const [status, setStatus] = useState<`success` | `failed` | `unknown`>(`unknown`);

  useEffect(() => {
    if (verified === `yes`) setStatus(`success`);
    else if (verified === `no`) setStatus(`failed`);
    else setStatus(`unknown`);
  }, [verified]);

  const linkClass =
    `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-600 px-4 py-2 ` +
    `font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`;

  if (!email) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4 text-center">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Invalid verification link</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Missing email parameter.</p>
        <Link href="/signup" className={linkClass}>
          Go back to signup
        </Link>
      </div>
    );
  }

  const decodedEmail = decodeURIComponent(email);

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 text-center">
      {status === `success` && (
        <>
          <h1 className="text-xl font-semibold text-green-700 dark:text-green-400">Email Verified</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Your email <span className="font-medium text-neutral-900 dark:text-white">{decodedEmail}</span> has been
            successfully verified.
          </p>
          <Link href="/login" className={linkClass}>
            Continue to Login
          </Link>
        </>
      )}
      {status === `failed` && (
        <>
          <h1 className="text-xl font-semibold text-red-700 dark:text-red-400">Verification Failed</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            The verification link for <span className="font-medium dark:text-white">{decodedEmail}</span> is invalid or
            expired.
          </p>
          <Link href="/signup" className={linkClass}>
            Try signing up again
          </Link>
        </>
      )}
      {status === `unknown` && (
        <>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Checking Verification...</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Please wait a moment.</p>
        </>
      )}
    </div>
  );
}
