'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import styles from '../../../components/ui/classNames.module.css';

const { authCallbackContainer } = styles;

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get(`next`) || `/dashboard`;

  useEffect(() => {
    let tries = 0;

    const interval = setInterval(() => {
      tries++;

      fetch(`/api/me`, { credentials: `include`, cache: `no-store` })
        .then((res) => {
          if (res.ok) {
            clearInterval(interval);
            router.replace(next);
          }
        })
        .catch(() => {
          // ignore transient network errors
        });

      // Safety exit: if token didn't appear after 5 seconds
      if (tries > 50) {
        clearInterval(interval);
        router.replace(`/login`);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [router, next]);

  return <div className={authCallbackContainer}>Redirecting…</div>;
}
