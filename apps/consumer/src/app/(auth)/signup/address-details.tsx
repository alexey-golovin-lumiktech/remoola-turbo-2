'use client';

import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/signup';

export default function AddressDetails() {
  const {
    state: { addressDetails },
    action: { updateAddressDetails, submitSignup },
  } = useSignupContext();

  const handleChangeAddressDetails = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    updateAddressDetails(e.target.name as Parameters<typeof updateAddressDetails>[0], e.target.value);
  };

  const submitAddressDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    submitSignup();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center mb-2">Address</h1>
      <h5 style={{ textAlign: `center` }}>Please provide your personal address</h5>

      <form
        className="flex flex-col items-center justify-center w-1/2" //
        onSubmit={submitAddressDetails}
      >
        <Input
          type="text"
          placeholder="Country"
          value={addressDetails.country}
          name="country"
          onChange={handleChangeAddressDetails}
          required
        />
        <div className="mt-3" />
        <Input
          type="text"
          placeholder="State / Region"
          value={addressDetails.state}
          name="state"
          onChange={handleChangeAddressDetails}
          required
        />
        <div className="mt-3" />
        <Input
          type="text"
          placeholder="Postal Code"
          value={addressDetails.postalCode}
          name="postalCode"
          onChange={handleChangeAddressDetails}
          required
        />
        <div className="mt-3" />
        <Input
          type="text"
          placeholder="City"
          value={addressDetails.city}
          name="city"
          onChange={handleChangeAddressDetails}
          required
        />
        <div className="mt-3" />
        <Input
          type="text"
          placeholder="Street"
          value={addressDetails.street}
          name="street"
          onChange={handleChangeAddressDetails}
          required
        />
        <div className="flex gap-2 mt-6 w-full">
          <Button type="submit" className="w-full">
            Submit address details
          </Button>
        </div>
      </form>
    </div>
  );
}
