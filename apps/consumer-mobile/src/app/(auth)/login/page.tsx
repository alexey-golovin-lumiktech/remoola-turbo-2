import { Suspense } from 'react';

import styles from './page.module.css';
import { parseSearchParams } from '../../../features/auth/schemas';
import { LoginForm } from '../../../features/auth/ui/LoginForm';

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function LoginPageSuspenseFallback() {
  return (
    <div className={styles.fallback} role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      <div className={styles.spinner} aria-hidden="true" />
    </div>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { nextPath, sessionExpired, authNotice } = parseSearchParams(params);
  return (
    <Suspense fallback={<LoginPageSuspenseFallback />}>
      <LoginForm nextPath={nextPath} sessionExpired={sessionExpired} authNotice={authNotice} />
    </Suspense>
  );
}
