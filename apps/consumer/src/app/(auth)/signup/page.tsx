'use client';

import { SignupContextProvider } from './context/provider';
import Signup from './signup';

export default function SignupPage() {
  return (
    <SignupContextProvider>
      <Signup />
    </SignupContextProvider>
  );
}
