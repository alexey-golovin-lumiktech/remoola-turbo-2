'use client';

import { useEffect } from 'react';

import { configureOpenAPI } from '../lib/generatedClient';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configureOpenAPI(() => (typeof window != `undefined` ? (localStorage.getItem(`token`) ?? undefined) : undefined));
  }, []);

  return <>{children}</>;
}
