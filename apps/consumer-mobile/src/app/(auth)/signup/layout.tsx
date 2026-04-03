'use client';

import { useEffect, useState } from 'react';

import { getSignupQuerySeed } from '../../../features/signup/routing';
import { SignupFormProvider } from '../../../features/signup/SignupFormContext';

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
