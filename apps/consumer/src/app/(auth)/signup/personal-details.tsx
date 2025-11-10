'use client';

import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { countries } from './context/countries';
import { useSignupContext } from './context/hooks';
import { ACCOUNT_TYPE, LEGAL_STATUS } from './context/types';
import { CustomSelect as CitizenOfCountriesSelect, CustomSelect as CountryOfTaxResidenceSelect } from './custom-select';

export default function PersonalDetails() {
  const {
    state: { personalDetails, accountType, consumerId },
    action: { updatePersonalDetails, nextStep, setError, setLoading },
  } = useSignupContext();

  const handleChangePersonalDetails = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    updatePersonalDetails(e.target.name as Parameters<typeof updatePersonalDetails>[0], e.target.value);
  };

  const submitPersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${consumerId}/personal-details`);
      let body;
      if (accountType === ACCOUNT_TYPE.CONTRACTOR) {
        body = {
          citizenOf: personalDetails.citizenOf,
          dateOfBirth: personalDetails.dateOfBirth,
          passportOrIdNumber: personalDetails.passportOrIdNumber,
          countryOfTaxResidence: personalDetails.countryOfTaxResidence,
          taxId: personalDetails.taxId,
          phoneNumber: personalDetails.phoneNumber,
          legalStatus: personalDetails.legalStatus || null,
        };
      } else {
        body = {
          citizenOf: personalDetails.citizenOf,
          dateOfBirth: personalDetails.dateOfBirth,
          passportOrIdNumber: personalDetails.passportOrIdNumber,
        };
      }
      const response = await fetch(url, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = JSON.parse(await response.text());
        console.log(`\n************ Error status: ${response.status} ************`);
        console.log(text.message.join(`\n`));
        throw new Error(text.message);
      }
      const json = await response.json();
      console.log(`submitPersonalDetails json`, json);
      nextStep();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center mb-2">Personal details</h1>
      <h5 style={{ textAlign: `center` }}>This will affect how your details are presented in the invoice</h5>

      <form
        className="flex flex-col items-center justify-center w-1/2" //
        onSubmit={submitPersonalDetails}
      >
        <CitizenOfCountriesSelect
          name="citizenOf" //
          value={personalDetails.citizenOf}
          onChange={handleChangePersonalDetails}
          label="Citizen Of"
          options={countries.map((x) => x.name)}
          defaultEmpty
        />
        {accountType !== ACCOUNT_TYPE.BUSINESS && (
          <>
            <div className="mt-3" />
            <CountryOfTaxResidenceSelect
              name="countryOfTaxResidence" //
              value={personalDetails.countryOfTaxResidence}
              onChange={handleChangePersonalDetails}
              label="Country of tax residence"
              options={countries.map((x) => x.name)}
              defaultEmpty
            />
            <div className="mt-3" />
            <CountryOfTaxResidenceSelect
              name="legalStatus" //
              label="Legal Status"
              value={personalDetails.legalStatus}
              options={Object.values(LEGAL_STATUS)}
              onChange={handleChangePersonalDetails}
              defaultEmpty
            />
            <div className="mt-3" />
            <Input
              type="text"
              placeholder="Tax ID (Optional)"
              value={personalDetails.taxId}
              name="taxId"
              onChange={handleChangePersonalDetails}
              required={false}
            />
          </>
        )}
        <div className="mt-3" />
        <Input
          type="text"
          placeholder="Date of Birth"
          value={personalDetails.dateOfBirth}
          name="dateOfBirth"
          onChange={handleChangePersonalDetails}
          required
        />
        <div className="mt-3" />
        <Input
          type="text"
          placeholder="Passport/ID number"
          value={personalDetails.passportOrIdNumber}
          name="passportOrIdNumber"
          onChange={handleChangePersonalDetails}
          required
        />
        {accountType !== ACCOUNT_TYPE.BUSINESS && (
          <>
            <div className="mt-3" />
            <Input
              type="text"
              placeholder="Phone number"
              value={personalDetails.phoneNumber}
              name="phoneNumber"
              onChange={handleChangePersonalDetails}
              required
            />
          </>
        )}
        <div className="flex gap-2 mt-6 w-full">
          <Button type="submit" className="w-full">
            Submit personal details
          </Button>
        </div>
      </form>
    </div>
  );
}
