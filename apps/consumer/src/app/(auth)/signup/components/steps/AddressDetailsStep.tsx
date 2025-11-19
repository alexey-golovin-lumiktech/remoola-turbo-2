/* eslint-disable max-len */
'use client';

import { useSignupSteps } from '../../context/SignupStepsContext';
import { useSignupForm } from '../../hooks/useSignupForm';
import { useSignupSubmit } from '../../hooks/useSignupSubmit';
import { STEP_NAME } from '../../types/step.types';
import { PrevNextButtons } from '../PrevNextButtons';

export function AddressDetailsStep() {
  const { addressDetails: address, updateAddress } = useSignupForm();
  const { markSubmitted } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();

  const handleSubmit = async () => {
    markSubmitted(STEP_NAME.ADDRESS_DETAILS);
    const result = await submit();
    if (result.success) {
      // maybe redirect or show success
      // router.push("/signup/success") for example
    }
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-sm">
      {/* <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border bg-white p-6 shadow-sm"> */}
      <h1 className="mb-2 text-lg font-semibold">Address details</h1>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Postal code</label>
        <input
          type="text"
          value={address.postalCode}
          onChange={(e) => updateAddress({ postalCode: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Country</label>
        <input
          type="text"
          value={address.country}
          onChange={(e) => updateAddress({ country: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">State / Region</label>
        <input
          type="text"
          value={address.state}
          onChange={(e) => updateAddress({ state: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">City</label>
        <input
          type="text"
          value={address.city}
          onChange={(e) => updateAddress({ city: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Street</label>
        <input
          type="text"
          value={address.street}
          onChange={(e) => updateAddress({ street: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : `Finish signup`} onClick={() => handleSubmit()} />
      {/* </form> */}
    </div>
  );
}
