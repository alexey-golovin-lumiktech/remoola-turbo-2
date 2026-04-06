'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import styles from './VerificationView.module.css';

export function VerificationView() {
  const searchParams = useSearchParams();
  const email = searchParams.get(`email`);
  const verified = searchParams.get(`verified`);
  const status: `success` | `failed` | `unknown` =
    verified === `yes` ? `success` : verified === `no` ? `failed` : `unknown`;

  if (!verified && !email) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Invalid verification link</h1>
        <p className={styles.textMuted}>This link is invalid or has expired.</p>
        <Link href="/signup" prefetch={false} className={styles.linkBtn}>
          Go back to signup
        </Link>
      </div>
    );
  }

  const decodedEmail = email ? decodeURIComponent(email) : ``;

  return (
    <div className={styles.container}>
      {status === `success` ? (
        <>
          <h1 className={styles.titleSuccess}>Email Verified</h1>
          <p className={styles.textMuted}>
            {email ? (
              <>
                Your email <span className={styles.emailHighlight}>{decodedEmail}</span> has been successfully verified.
              </>
            ) : (
              <>Your email has been successfully verified.</>
            )}
          </p>
          <Link href="/login" prefetch={false} className={styles.linkBtn}>
            Continue to Login
          </Link>
        </>
      ) : null}
      {status === `failed` ? (
        <>
          <h1 className={styles.titleFailed}>Verification Failed</h1>
          <p className={styles.textMuted}>
            {email ? (
              <>
                The verification link for <span className={styles.emailHighlight}>{decodedEmail}</span> is invalid or
                expired.
              </>
            ) : (
              <>This verification link is invalid or expired.</>
            )}
          </p>
          <Link href="/signup" prefetch={false} className={styles.linkBtn}>
            Try signing up again
          </Link>
        </>
      ) : null}
      {status === `unknown` ? (
        <>
          <h1 className={styles.title}>Checking Verification...</h1>
          <p className={styles.textUnknown}>Please wait a moment.</p>
        </>
      ) : null}
    </div>
  );
}
