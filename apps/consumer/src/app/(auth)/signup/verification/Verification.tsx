'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import styles from '../../../../components/ui/classNames.module.css';

const {
  verificationContainer,
  verificationEmail,
  verificationFailedTitle,
  verificationLink,
  verificationMutedText,
  verificationSuccessTitle,
  verificationText,
  verificationTitle,
  verificationUnknownTitle,
} = styles;

export default function Verification() {
  const searchParams = useSearchParams();

  const email = searchParams.get(`email`);
  const verified = searchParams.get(`verified`);

  const [status, setStatus] = useState<`success` | `failed` | `unknown`>(`unknown`);

  useEffect(() => {
    if (verified === `yes`) setStatus(`success`);
    else if (verified === `no`) setStatus(`failed`);
    else setStatus(`unknown`);
  }, [verified]);

  if (!verified && !email) {
    return (
      <div className={verificationContainer}>
        <h1 className={verificationTitle}>Invalid or expired verification link</h1>
        <p className={verificationText}>This link is invalid or has expired.</p>
        <Link href="/signup" className={verificationLink}>
          Go back to signup
        </Link>
      </div>
    );
  }

  return (
    <div className={verificationContainer}>
      {status === `success` && (
        <>
          <h1 className={verificationSuccessTitle}>Email verified</h1>
          <p className={verificationText}>
            {email ? (
              <>
                Your email <span className={verificationEmail}>{decodeURIComponent(email)}</span> has been successfully
                verified.
              </>
            ) : (
              <>Your email has been successfully verified.</>
            )}
          </p>
          <Link href="/login" className={verificationLink}>
            Continue to Sign In
          </Link>
        </>
      )}

      {status === `failed` && (
        <>
          <h1 className={verificationFailedTitle}>Verification failed</h1>
          <p className={verificationText}>
            {email ? (
              <>
                The verification link for <span className={verificationEmail}>{decodeURIComponent(email)}</span> is
                invalid or expired.
              </>
            ) : (
              <>This verification link is invalid or expired.</>
            )}
          </p>
          <Link href="/signup" className={verificationLink}>
            Try signing up again
          </Link>
        </>
      )}

      {status === `unknown` && (
        <>
          <h1 className={verificationUnknownTitle}>Checking verification...</h1>
          <p className={verificationMutedText}>Please wait a moment.</p>
        </>
      )}
    </div>
  );
}
