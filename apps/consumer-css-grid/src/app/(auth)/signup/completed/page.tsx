import Link from 'next/link';

import styles from '../../auth-pages.module.css';

interface SignupCompletedPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupCompletedPage({ searchParams }: SignupCompletedPageProps) {
  const params = await searchParams;
  const emailParam = params.email;
  const email =
    typeof emailParam === `string` ? emailParam : Array.isArray(emailParam) && emailParam[0] ? emailParam[0] : null;

  return (
    <div className={styles.root}>
      <div className={styles.narrowContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            {email
              ? `We created your account for ${email}. Please open the verification email to finish onboarding.`
              : `We created your account. Please open the verification email to finish onboarding.`}
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.stack}>
            <div className={styles.successBanner}>
              <p className={styles.successMessage}>
                After verifying your email, you can come back and sign in normally.
              </p>
            </div>

            <div className={styles.actions}>
              <Link href="/login" prefetch={false} className={styles.submitBtn}>
                Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
