'use client';

import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { PrevNextButtons } from '../PrevNextButtons';

export function AddressDetailsStep() {
  const { isContractorIndividual, addressDetails, updateAddress } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.ADDRESS_DETAILS);

    if (isContractorIndividual) return submit();
    else return goNext();
  };

  let prevNextButtonsText = `Next step`;
  if (isContractorIndividual) prevNextButtonsText = `Finish signup`;

  return (
    <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-lg font-semibold">Address details</h1>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Postal code</label>
        <input
          type="text"
          value={addressDetails.postalCode || ``}
          onChange={(e) => updateAddress({ postalCode: e.target.value.trim() || null })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Country</label>
        <input
          type="text"
          value={addressDetails.country || ``}
          onChange={(e) => updateAddress({ country: e.target.value.trim() || null })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">State / Region</label>
        <input
          type="text"
          value={addressDetails.state || ``}
          onChange={(e) => updateAddress({ state: e.target.value.trim() || null })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">City</label>
        <input
          type="text"
          value={addressDetails.city || ``}
          onChange={(e) => updateAddress({ city: e.target.value.trim() || null })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">Street</label>
        <input
          type="text"
          value={addressDetails.street || ``}
          onChange={(e) => updateAddress({ street: e.target.value.trim() || null })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} onClick={() => handleSubmit()} />
    </div>
  );
}
