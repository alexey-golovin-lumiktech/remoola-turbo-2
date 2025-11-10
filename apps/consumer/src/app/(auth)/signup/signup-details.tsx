'use client';

import { type ChangeEvent } from 'react';
import { FcGoogle } from 'react-icons/fc';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';
import { ACCOUNT_TYPE } from './context/types';
import { HeardAboutUsSection } from './hear-about-select';

export default function SignupDetails() {
  const {
    state: { signupDetails, accountType, contractorKind },
    action: { updateSignupDetails, nextStep, handleGoogleSignup, setError, setLoading, setConsumerId },
  } = useSignupContext();

  const handleChangeSignupDetails = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    console.log(`e.target.name`, e.target.name);
    updateSignupDetails(e.target.name as Parameters<typeof updateSignupDetails>[0], e.target.value);
  };

  const lookup = {
    [ACCOUNT_TYPE.BUSINESS]: `Sign up as an organization`,
    [ACCOUNT_TYPE.CONTRACTOR]: `Sign up as a contractor`,
  };

  const submitSignupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify({
          firstName: signupDetails.firstName,
          lastName: signupDetails.lastName,
          email: signupDetails.email,
          password: signupDetails.password,
          howDidHearAboutUs: signupDetails.howDidHearAboutUs,
          accountType,
          contractorKind: accountType === ACCOUNT_TYPE.CONTRACTOR ? contractorKind : null,
        }),
      });
      if (!response.ok) throw new Error(`Signup failed`);
      const json = await response.json();
      console.log(`submitSignupDetails json`, json);
      setConsumerId(json?.consumerId || null);
      nextStep();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center mb-2">{lookup[accountType]}</h1>
      <h5 style={{ textAlign: `center` }}>Sign up with your work Google account or use the form</h5>

      <Button
        type="button"
        variant="ghost"
        className="flex w-1/2 items-center justify-center gap-3 py-2"
        onClick={handleGoogleSignup}
      >
        <FcGoogle size={22} />
        <span>Sign up with Google</span>
      </Button>
      <div className="flex items-center w-1/2 my-4">
        <hr className="flex-grow border-gray-300" />
        <span className="px-2 text-sm font-medium text-gray-500 bg-white">or</span>
        <hr className="flex-grow border-gray-300" />
      </div>

      <form
        className="flex flex-col items-center justify-center w-1/2" //
        onSubmit={submitSignupDetails}
      >
        <Input
          type="text"
          placeholder="First Name"
          value={signupDetails.firstName}
          name="firstName"
          onChange={handleChangeSignupDetails}
        />
        <div className="mt-3" />

        <Input
          type="text"
          placeholder="Last Name"
          value={signupDetails.lastName}
          name="lastName"
          onChange={handleChangeSignupDetails}
        />
        <div className="mt-3" />

        <Input
          type="email"
          placeholder="Email Address"
          value={signupDetails.email}
          name="email"
          onChange={handleChangeSignupDetails}
        />
        <div className="mt-3" />
        <Input
          type="password"
          placeholder="Password"
          value={signupDetails.password}
          name="password"
          onChange={handleChangeSignupDetails}
        />
        <div className="mt-3" />
        <HeardAboutUsSection />
        <div className="flex gap-2 mt-6 w-full">
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </div>
      </form>
    </div>
  );
}
