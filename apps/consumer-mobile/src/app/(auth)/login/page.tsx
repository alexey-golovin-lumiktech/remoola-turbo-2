import { Suspense } from 'react';

import { parseSearchParams } from '../../../features/auth/schemas';
import { LoginForm } from '../../../features/auth/ui/LoginForm';

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { nextPath, sessionExpired } = parseSearchParams(params);

  return (
    <Suspense
      fallback={
        <div
          className={`
            flex
            min-h-screen
            items-center
            justify-center
          `}
          aria-busy="true"
        >
          <div
            className={`
              h-8
              w-8
              animate-pulse
              rounded-full
              bg-slate-300
              dark:bg-slate-600
            `}
          />
        </div>
      }
    >
      <LoginForm nextPath={nextPath} sessionExpired={sessionExpired} />
    </Suspense>
  );
}
