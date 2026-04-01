import Link from 'next/link';

import { ResetPasswordConfirmPageClient } from './ResetPasswordConfirmPageClient';
import styles from '../../auth-pages.module.css';

interface ResetPasswordConfirmPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordConfirmPage({ searchParams }: ResetPasswordConfirmPageProps) {
  const params = await searchParams;
  const tokenParam = params.token;
  const token =
    typeof tokenParam === `string`
      ? tokenParam.trim()
      : Array.isArray(tokenParam) && tokenParam[0]
        ? tokenParam[0]
        : ``;

  if (!token) {
    return (
      <div className={styles.root}>
        <div className={styles.narrowContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Invalid or missing link</h1>
            <p className={styles.subtitle}>This reset link is invalid or has expired. Request a new one below.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.actions}>
              <Link href="/forgot-password" prefetch={false} className={styles.submitBtn}>
                Request a new reset link
              </Link>
            </div>
          </div>

          <p className={styles.footer}>
            <Link href="/login" prefetch={false} className={styles.link}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <ResetPasswordConfirmPageClient token={token} />;
}
