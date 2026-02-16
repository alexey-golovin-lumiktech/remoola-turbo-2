'use client';

import { useState } from 'react';

import { FormInput, DateInput, CountrySelect, FormSelect, PhoneInput } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME, STATUS_LABEL, LABEL_STATUS, LEGAL_STATUS_LABEL } from '../../../../../types';
import { useSignupForm, useSignupSteps } from '../../hooks';
import { getFieldErrors, entityDetailsSchema, personalDetailsSchema } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { signupStepCard, signupStepGrid, signupStepTitle } = styles;

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

  const clearError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
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
          onChange={(value) => updateAddress({ street: value })}
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

      <div className={signupStepGrid}>
        <FormInput
          label="First name"
          value={personal.firstName}
          onChange={(value) => updatePersonal({ firstName: value })}
          error={fieldErrors.firstName}
          onErrorClear={() => clearError(`firstName`)}
        />
        <FormInput
          label="Last name"
          value={personal.lastName}
          onChange={(value) => updatePersonal({ lastName: value })}
          error={fieldErrors.lastName}
          onErrorClear={() => clearError(`lastName`)}
        />
      </div>

      <CountrySelect
        label="Citizen of"
        value={personal.citizenOf}
        onChange={(value) =>
          updatePersonal({
            citizenOf: value,
            countryOfTaxResidence: value,
          })
        }
        error={fieldErrors.citizenOf}
        onErrorClear={() => clearError(`citizenOf`)}
      />

      <CountrySelect
        label="Country of tax residence"
        value={personal.countryOfTaxResidence}
        onChange={(value) => updatePersonal({ countryOfTaxResidence: value })}
        error={fieldErrors.countryOfTaxResidence}
        onErrorClear={() => clearError(`countryOfTaxResidence`)}
      />

      <FormSelect
        label="Legal Status"
        value={STATUS_LABEL[personal.legalStatus!] ?? ``}
        onChange={(value) => {
          updatePersonal({ legalStatus: LABEL_STATUS[value as keyof typeof LABEL_STATUS] });
          clearError(`legalStatus`);
        }}
        options={[
          { label: LEGAL_STATUS_LABEL.INDIVIDUAL, value: LEGAL_STATUS_LABEL.INDIVIDUAL },
          { label: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR, value: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR },
          { label: LEGAL_STATUS_LABEL.SOLE_TRADER, value: LEGAL_STATUS_LABEL.SOLE_TRADER },
        ]}
        error={fieldErrors.legalStatus}
        onErrorClear={() => clearError(`legalStatus`)}
        placeholder="Select legal status..."
        isClearable={false}
      />

      <FormInput
        label="Tax ID"
        value={personal.taxId}
        onChange={(value) => updatePersonal({ taxId: value })}
        error={fieldErrors.taxId}
        onErrorClear={() => clearError(`taxId`)}
      />

      <DateInput
        label="Date of birth"
        value={personal.dateOfBirth}
        onChange={(value) => updatePersonal({ dateOfBirth: value || `` })}
        error={fieldErrors.dateOfBirth}
        onErrorClear={() => clearError(`dateOfBirth`)}
        placeholder="Select your date of birth"
        required
      />

      <FormInput
        label="Passport/ID number"
        value={personal.passportOrIdNumber}
        onChange={(value) => updatePersonal({ passportOrIdNumber: value })}
        error={fieldErrors.passportOrIdNumber}
        onErrorClear={() => clearError(`passportOrIdNumber`)}
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
