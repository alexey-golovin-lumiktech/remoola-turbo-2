'use client';

import Link from 'next/link';

import { CheckCircleIcon } from '@remoola/ui';

import styles from './CompletedView.module.css';

export function CompletedView() {
  return (
    <div className={styles.wrapper} data-testid="consumer-signup-completed-page">
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <CheckCircleIcon size={36} className={styles.icon} />
        </div>
        <h1 className={styles.title}>Sign up successful</h1>
        <h2 className={styles.subtitle}>
          Welcome to <span className={styles.subtitleBold}>Remoola</span>
        </h2>
        <p className={styles.message}>
          We have sent you an email to confirm your email and activate your account. Check your email and come back
          soon.
        </p>
        <Link href="/login" prefetch={false} className={styles.link} data-testid="consumer-signup-completed-link-login">
          Click to Sign In
        </Link>
      </div>
    </div>
  );
}
