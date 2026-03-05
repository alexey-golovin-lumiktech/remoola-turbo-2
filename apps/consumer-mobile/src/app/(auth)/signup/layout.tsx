'use client';

import { SignupFormProvider } from '../../../features/signup/SignupFormContext';

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <SignupFormProvider>{children}</SignupFormProvider>;
}
