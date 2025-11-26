'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get(`token`);
    if (token) {
      document.cookie = `access_token=${token}; path=/; max-age=900`;
      router.replace(`/profile`);
    } else {
      router.replace(`/login`);
    }
  }, [params, router]);

  return (
    <div className="flex h-screen items-center justify-center text-gray-600">
      <p>Signing you in with Google...</p>
    </div>
  );
}
