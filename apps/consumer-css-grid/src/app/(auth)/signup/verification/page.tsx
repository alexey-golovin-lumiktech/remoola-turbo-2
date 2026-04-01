import Link from 'next/link';

import styles from '../../auth-pages.module.css';

interface SignupVerificationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupVerificationPage({ searchParams }: SignupVerificationPageProps) {
  const params = await searchParams;
  const emailParam = params.email;
  const verifiedParam = params.verified;
  const email =
    typeof emailParam === `string` ? emailParam : Array.isArray(emailParam) && emailParam[0] ? emailParam[0] : null;
  const verified =
    typeof verifiedParam === `string`
      ? verifiedParam
      : Array.isArray(verifiedParam) && verifiedParam[0]
        ? verifiedParam[0]
        : null;

  if (!verified && !email) {
    return (
      <div className={styles.root}>
        <div className={styles.narrowContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Invalid verification link</h1>
            <p className={styles.subtitle}>This link is invalid or has expired.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.actions}>
              <Link href="/signup/start" prefetch={false} className={styles.submitBtn}>
                Start sign-up again
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const decodedEmail = email ? decodeURIComponent(email) : ``;
  const isSuccess = verified === `yes`;
  const isFailure = verified === `no`;

  return (
    <div className={styles.root}>
      <div className={styles.narrowContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {isSuccess ? `Email verified` : isFailure ? `Verification failed` : `Checking verification`}
          </h1>
          <p className={styles.subtitle}>
            {isSuccess
              ? decodedEmail
                ? `${decodedEmail} has been verified successfully.`
                : `Your email has been verified successfully.`
              : isFailure
                ? decodedEmail
                  ? `The verification link for ${decodedEmail} is invalid or expired.`
                  : `This verification link is invalid or expired.`
                : `Please wait a moment.`}
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.actions}>
            {isSuccess ? (
              <Link href="/login" prefetch={false} className={styles.submitBtn}>
                Continue to sign in
              </Link>
            ) : isFailure ? (
              <Link href="/signup/start" prefetch={false} className={styles.submitBtn}>
                Try sign-up again
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
