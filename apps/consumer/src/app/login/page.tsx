'use client';

import { Suspense } from 'react';

import LoginForm from './LoginForm';
import styles from './page.module.css';

function LoginFormSkeleton() {
  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonFields}>
        <div className={styles.skeletonInput} />
        <div className={styles.skeletonInput} />
        <div className={styles.skeletonLink} />
        <div className={styles.skeletonInput} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
