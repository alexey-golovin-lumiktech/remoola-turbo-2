'use client';

import { SignupContextProvider } from './context/signup';
import Signup from './signup';

export default function SignupPage() {
  return (
    <SignupContextProvider>
      <Signup />
    </SignupContextProvider>
  );
}
