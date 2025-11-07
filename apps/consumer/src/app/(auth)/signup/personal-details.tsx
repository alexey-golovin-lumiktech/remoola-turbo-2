'use client';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';
import { ACCOUNT_TYPE } from './context/types';

export default function PersonalDetails() {
  const {
    state: { personalDetails, accountType },
    action: { updatePersonalDetails, nextStep, prevStep },
  } = useSignupContext();

  return (
    <form onSubmit={(e) => (e.preventDefault(), nextStep())}>
      <Input
        type="text"
        placeholder="I'm a citizen of"
        value={personalDetails.citizenOf}
        onChange={(e) => updatePersonalDetails(`citizenOf`, e.target.value)}
        required
      />
      {accountType !== ACCOUNT_TYPE.BUSINESS && (
        <>
          <div className="mt-3" />
          <Input
            type="text"
            placeholder="Country of tax residence"
            value={personalDetails.countryOfTaxResidence}
            onChange={(e) => updatePersonalDetails(`countryOfTaxResidence`, e.target.value)}
            required
          />
          <div className="mt-3" />
          <Input
            type="text"
            placeholder="Legal Status"
            value={personalDetails.legalStatus}
            onChange={(e) => updatePersonalDetails(`legalStatus`, e.target.value)}
            required
          />
          <div className="mt-3" />
          <Input
            type="text"
            placeholder="Tax ID (Optional)"
            value={personalDetails.taxId}
            onChange={(e) => updatePersonalDetails(`taxId`, e.target.value)}
            required
          />
        </>
      )}
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="Date of Birth"
        value={personalDetails.dateOfBirth}
        onChange={(e) => updatePersonalDetails(`dateOfBirth`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="Passport/ID number"
        value={personalDetails.passportOrIdNumber}
        onChange={(e) => updatePersonalDetails(`passportOrIdNumber`, e.target.value)}
        required
      />
      {accountType !== ACCOUNT_TYPE.BUSINESS && (
        <>
          <div className="mt-3" />
          <Input
            type="text"
            placeholder="Phone number"
            value={personalDetails.phoneNumber}
            onChange={(e) => updatePersonalDetails(`phoneNumber`, e.target.value)}
            required
          />
        </>
      )}
      <div className="flex gap-2 mt-6">
        <Button variant="primary" onClick={prevStep} className="w-1/2">
          Back
        </Button>
        <Button type="submit" className="w-1/2">
          Next
        </Button>
      </div>
    </form>
  );
}
