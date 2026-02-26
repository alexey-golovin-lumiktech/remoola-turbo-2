'use client';

import { useCallback, useState } from 'react';

import { PersonalDetailsFields } from '../../../../../components/personal-details';
import { FormInput, CountrySelect, PhoneInput } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps } from '../../hooks';
import { parseAddressFromString } from '../../utils/parseAddressFromString';
import { getFieldErrors, entityDetailsSchema, personalDetailsSchema } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { signupStepCard, signupStepTitle } = styles;

export function PersonalDetailsStep() {
  const {
    isBusiness,
    isContractorEntity,
    personalDetails: personal,
    organizationDetails,
    addressDetails,
    updatePersonal,
    updateOrganization,
    updateAddress,
  } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEntity = isBusiness || isContractorEntity;

  const handleLegalAddressChange = useCallback(
    (value: string) => {
      updateAddress({ street: value });
      if (!value.trim()) return;
      const parsed = parseAddressFromString(value);
      const updates: Parameters<typeof updateAddress>[0] = {};
      if (parsed.postalCode) updates.postalCode = parsed.postalCode;
      if (parsed.country) updates.country = parsed.country;
      if (parsed.state) updates.state = parsed.state;
      if (parsed.city) updates.city = parsed.city;
      if (Object.keys(updates).length > 0) {
        updateAddress(updates);
      }
      if (parsed.country) {
        updatePersonal({ countryOfTaxResidence: parsed.country });
      }
    },
    [updateAddress, updatePersonal],
  );

  const clearError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
  }, []);

  const handlePersonalChange = useCallback(
    (field: string, value: string) => {
      if (field === `citizenOf`) {
        updatePersonal({ citizenOf: value, countryOfTaxResidence: value });
      } else {
        updatePersonal({ [field]: value } as Parameters<typeof updatePersonal>[0]);
      }
      clearError(field);
    },
    [updatePersonal, clearError],
  );

  const values = {
    firstName: personal.firstName ?? ``,
    lastName: personal.lastName ?? ``,
    citizenOf: personal.citizenOf ?? ``,
    countryOfTaxResidence: personal.countryOfTaxResidence ?? ``,
    legalStatus: personal.legalStatus ?? ``,
    taxId: personal.taxId ?? ``,
    dateOfBirth: personal.dateOfBirth ?? ``,
    passportOrIdNumber: personal.passportOrIdNumber ?? ``,
    phoneNumber: personal.phoneNumber ?? ``,
  };

  const handleSubmit = () => {
    if (isEntity) {
      const entityData = {
        companyName: organizationDetails.name,
        countryOfTaxResidence: personal.countryOfTaxResidence,
        taxId: personal.taxId,
        phoneNumber: personal.phoneNumber,
        legalAddress: addressDetails.street,
      };
      const result = entityDetailsSchema.safeParse(entityData);
      if (!result.success) {
        setFieldErrors(getFieldErrors(result.error));
        return;
      }
    } else {
      const result = personalDetailsSchema.safeParse(personal);
      if (!result.success) {
        setFieldErrors(getFieldErrors(result.error));
        return;
      }
    }

    setFieldErrors({});
    markSubmitted(STEP_NAME.PERSONAL_DETAILS);
    goNext();
  };

  if (isEntity) {
    return (
      <div className={signupStepCard}>
        <h1 className={signupStepTitle}>Entity details</h1>

        <FormInput
          label="Company Name"
          value={organizationDetails.name}
          onChange={(value) => updateOrganization({ name: value })}
          error={fieldErrors.companyName}
          onErrorClear={() => clearError(`companyName`)}
        />

        <CountrySelect
          label="Country of tax residence"
          value={personal.countryOfTaxResidence}
          onChange={(value) => updatePersonal({ countryOfTaxResidence: value })}
          error={fieldErrors.countryOfTaxResidence}
          onErrorClear={() => clearError(`countryOfTaxResidence`)}
        />

        <FormInput
          label="Tax ID"
          value={personal.taxId}
          onChange={(value) => updatePersonal({ taxId: value })}
          error={fieldErrors.taxId}
          onErrorClear={() => clearError(`taxId`)}
        />

        <FormInput
          label="Legal address"
          value={addressDetails.street || ``}
          onChange={handleLegalAddressChange}
          error={fieldErrors.legalAddress}
          onErrorClear={() => clearError(`legalAddress`)}
        />

        <PhoneInput
          label="Phone number"
          value={personal.phoneNumber}
          onChange={(value) => updatePersonal({ phoneNumber: value ?? `` })}
          error={fieldErrors.phoneNumber}
          onErrorClear={() => clearError(`phoneNumber`)}
          defaultCountryName={personal.countryOfTaxResidence || undefined}
        />

        <PrevNextButtons handleClick={() => handleSubmit()} />
      </div>
    );
  }

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Personal details</h1>

      <PersonalDetailsFields
        values={values}
        onChange={handlePersonalChange}
        errors={fieldErrors}
        onErrorClear={clearError}
        dateOfBirthRequired
      />

      <PrevNextButtons handleClick={() => handleSubmit()} />
    </div>
  );
}
