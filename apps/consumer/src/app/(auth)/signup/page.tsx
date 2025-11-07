'use client';

import { SignupContextProvider } from './context/provider';
import Signup from './signup';

export default function SignupPage() {
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError(null);

  //   if (state.password !== state.confirm) {
  //     setError(`Passwords do not match`);
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup`, {
  //       method: `POST`,
  //       headers: { 'Content-Type': `application/json` },
  //       body: JSON.stringify(state),
  //     });
  //     if (!res.ok) throw new Error(`Signup failed`);
  //     window.location.href = `/login`;
  //   } catch (err: any) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <SignupContextProvider>
      <Signup />
    </SignupContextProvider>
  );
}
