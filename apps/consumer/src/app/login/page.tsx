'use client';

import { Suspense } from 'react';

import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Loading login form...</p>}>
      <LoginForm />
    </Suspense>
  );
}
