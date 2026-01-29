'use client';

import { SignupFormProvider } from './hooks/useSignupForm';

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <SignupFormProvider>{children}</SignupFormProvider>;
}
