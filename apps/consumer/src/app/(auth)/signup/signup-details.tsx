'use client';

import { FcGoogle } from 'react-icons/fc';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';

export default function SignupDetails() {
  const { state, action } = useSignupContext();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-center gap-3 py-2"
        onClick={action.handleGoogleSignup}
      >
        <FcGoogle size={22} />
        <span>Sign up with Google</span>
      </Button>

      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <Input
        type="text"
        placeholder="First Name"
        value={state.signupDetails.firstName}
        onChange={(e) => action.updateSignupDetails(`firstName`, e.target.value)}
        required
      />
      <div className="mt-3" />

      <Input
        type="text"
        placeholder="Last Name"
        value={state.signupDetails.lastName}
        onChange={(e) => action.updateSignupDetails(`lastName`, e.target.value)}
        required
      />
      <div className="mt-3" />

      <Input
        type="email"
        placeholder="Email Address"
        value={state.signupDetails.email}
        onChange={(e) => action.updateSignupDetails(`email`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="password"
        placeholder="Password"
        value={state.signupDetails.password}
        onChange={(e) => action.updateSignupDetails(`password`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <label htmlFor="howDidHearAboutUs">
        How did you hear about us?
        <Input
          type="text"
          name="howDidHearAboutUs"
          value={state.signupDetails.howDidHearAboutUs}
          onChange={(e) => action.updateSignupDetails(`howDidHearAboutUs`, e.target.value)}
          required
        />
      </label>
      {state.error && <p className="text-sm text-red-600 mt-3">{state.error}</p>}
      <Button variant="primary" onClick={action.nextStep} className="w-full mt-6">
        Next
      </Button>
    </>
  );
}
