'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get(`next`) || `/dashboard`;

  useEffect(() => {
    let tries = 0;

    const interval = setInterval(() => {
      tries++;

      // cookie MUST be httpOnly: check via document.cookie
      const hasToken = document.cookie.includes(`access_token=`);

      if (hasToken) {
        clearInterval(interval);
        router.replace(next);
      }

      // Safety exit: if token didn't appear after 5 seconds
      if (tries > 50) {
        clearInterval(interval);
        router.replace(`/login`);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [router, next]);

  return <div className="flex h-screen items-center justify-center text-gray-600">Redirecting…</div>;
}
