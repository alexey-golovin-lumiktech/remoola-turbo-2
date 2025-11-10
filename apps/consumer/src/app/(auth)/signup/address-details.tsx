'use client';

import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';

export default function AddressDetails() {
  const {
    state: { addressDetails, consumerId },
    action: { updateAddressDetails, setError, setLoading },
  } = useSignupContext();

  const handleChangeAddressDetails = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    updateAddressDetails(e.target.name as Parameters<typeof updateAddressDetails>[0], e.target.value);
  };

  const submitAddressDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${consumerId}/address-details`);
      const response = await fetch(url, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify({
          postalCode: addressDetails.postalCode,
          country: addressDetails.country,
          city: addressDetails.city,
          state: addressDetails.state,
          street: addressDetails.street,
        }),
      });
      if (!response.ok) throw new Error(`Signup failed`);
      const json = await response.json();

      const complete = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${consumerId}/complete-profile-creation`,
      );
      await fetch(complete);
      console.log(`submitAddressDetails json`, json);
      window.location.href = `/login`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
