'use client';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';

export default function AddressDetails() {
  const {
    state: { addressDetails },
    action: { updateAddressDetails, nextStep, prevStep },
  } = useSignupContext();

  return (
    <form onSubmit={(e) => (e.preventDefault(), nextStep())}>
      <Input
        type="text"
        placeholder="Country"
        value={addressDetails.country}
        onChange={(e) => updateAddressDetails(`country`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="State / Region"
        value={addressDetails.state}
        onChange={(e) => updateAddressDetails(`state`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="Postal Code"
        value={addressDetails.postalCode}
        onChange={(e) => updateAddressDetails(`postalCode`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="City"
        value={addressDetails.city}
        onChange={(e) => updateAddressDetails(`city`, e.target.value)}
        required
      />
      <div className="mt-3" />
      <Input
        type="text"
        placeholder="Street"
        value={addressDetails.street}
        onChange={(e) => updateAddressDetails(`street`, e.target.value)}
        required
      />
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
