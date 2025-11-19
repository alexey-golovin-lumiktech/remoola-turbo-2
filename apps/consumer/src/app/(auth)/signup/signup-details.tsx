'use client';

import { type ChangeEvent } from 'react';
import { FcGoogle } from 'react-icons/fc';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';
import { PasswordInput } from '@remoola/ui/PasswordInput';
import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import { useSignupContext, ACCOUNT_TYPE, type IHowDidHearAboutUs, HOW_DID_HEAR_ABOUT_US } from './context/signup';
import { generatePassword } from '../../../lib/password';

export default function SignupDetails() {
  // should removed
  const {
    state: { signupDetails, accountType },
    action: { updateSignupDetails, nextStep, handleGoogleSignup },
  } = useSignupContext();

  const handleGenerate = () => {
    const generatedPassword = generatePassword({
      length: 14,
      symbols: true,
      noAmbiguous: true,
    });
    updateSignupDetails(`password`, generatedPassword);
  };

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
    nextStep();
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
        <div className="flex flex-row w-full">
          <PasswordInput
            placeholder="Your password"
            value={signupDetails.password}
            onChange={handleChangeSignupDetails}
          />
          <Button type="button" className="bg-blue-600 px-2 ml-2 text-white rounded" onClick={handleGenerate}>
            Generate
          </Button>
        </div>
        <div className="mt-3" />
        <SelectWithClear<IHowDidHearAboutUs>
          label="How Did You Hear About Us?"
          value={HOW_DID_HEAR_ABOUT_US.GOOGLE}
          onChange={(howDidHearAboutUs) => updateSignupDetails(`howDidHearAboutUs`, howDidHearAboutUs!)}
          options={[
            { label: HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY, value: HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY },
            { label: HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR, value: HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR },
            { label: HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED, value: HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED },
            { label: HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE, value: HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE },
            { label: HOW_DID_HEAR_ABOUT_US.GOOGLE, value: HOW_DID_HEAR_ABOUT_US.GOOGLE },
            { label: HOW_DID_HEAR_ABOUT_US.FACEBOOK, value: HOW_DID_HEAR_ABOUT_US.FACEBOOK },
            { label: HOW_DID_HEAR_ABOUT_US.TWITTER, value: HOW_DID_HEAR_ABOUT_US.TWITTER },
            { label: HOW_DID_HEAR_ABOUT_US.LINKED_IN, value: HOW_DID_HEAR_ABOUT_US.LINKED_IN },
            { label: HOW_DID_HEAR_ABOUT_US.OTHER, value: HOW_DID_HEAR_ABOUT_US.OTHER },
          ]}
          showOtherField
          showNotSelected={false}
        />
        <div className="flex gap-2 mt-6 w-full">
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </div>
      </form>
    </div>
  );
}
