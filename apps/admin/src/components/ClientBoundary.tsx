import { Suspense } from 'react';

export function ClientBoundary({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <Suspense fallback={fallback ?? null}>{children}</Suspense>;
}
