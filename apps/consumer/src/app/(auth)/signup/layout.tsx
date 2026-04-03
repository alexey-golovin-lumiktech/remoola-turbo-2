'use client';

import { useEffect, useState } from 'react';

import { SignupFormProvider } from './hooks/useSignupForm';
import { getSignupQuerySeed } from './routing';

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const querySeed = getSignupQuerySeed(window.location.search);

  return <SignupFormProvider querySeed={querySeed}>{children}</SignupFormProvider>;
}
