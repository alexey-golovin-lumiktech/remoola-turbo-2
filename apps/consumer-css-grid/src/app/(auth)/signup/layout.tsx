'use client';

import { useEffect, useState } from 'react';

import { SignupFormProvider } from '../../../features/signup/SignupFormContext';

function getQuerySeed(search: string) {
  if (!search) {
    return {
      accountTypeParam: null,
      contractorKindParam: null,
      googleSignupToken: null,
    };
  }

  const searchParams = new URLSearchParams(search);
  return {
    accountTypeParam: searchParams.get(`accountType`),
    contractorKindParam: searchParams.get(`contractorKind`),
    googleSignupToken: searchParams.get(`googleSignupToken`),
  };
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const querySeed = getQuerySeed(window.location.search);

  return <SignupFormProvider querySeed={querySeed}>{children}</SignupFormProvider>;
}
