import { Suspense } from 'react';

import styles from './page.module.css';
import { parseSearchParams } from '../../../features/auth/schemas';
import { LoginForm } from '../../../features/auth/ui/LoginForm';

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function LoginPageSuspenseFallback() {
  return (
    <div className={styles.fallback} aria-busy="true">
      <div className={styles.spinner} />
    </div>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { nextPath, sessionExpired } = parseSearchParams(params);
  return (
    <Suspense fallback={<LoginPageSuspenseFallback />}>
      <LoginForm nextPath={nextPath} sessionExpired={sessionExpired} />
    </Suspense>
  );
}
