'use client';

import { getCountryCode } from '../../lib/countries';
import { getPassportPlaceholder } from '../../lib/passport-validation';
import { LABEL_STATUS, LEGAL_STATUS_LABEL, STATUS_LABEL } from '../../types';
import { CountrySelect, DateInput, FormInput, FormSelect, PhoneInput } from '../ui';
import styles from '../ui/classNames.module.css';

const { formGridClass, formGridSpan2 } = styles;

export interface PersonalDetailsValues {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: string;
  taxId: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  phoneNumber: string;
}

const LEGAL_STATUS_OPTIONS = [
  { label: LEGAL_STATUS_LABEL.INDIVIDUAL, value: LEGAL_STATUS_LABEL.INDIVIDUAL },
  { label: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR, value: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR },
  { label: LEGAL_STATUS_LABEL.SOLE_TRADER, value: LEGAL_STATUS_LABEL.SOLE_TRADER },
];

export interface PersonalDetailsFieldsProps {
  values: PersonalDetailsValues;
  onChange: (field: keyof PersonalDetailsValues, value: string) => void;
  errors?: Record<string, string>;
  onErrorClear?: (field: string) => void;
  /** When true, date of birth shows required indicator (e.g. signup). Default false. */
  dateOfBirthRequired?: boolean;
}

export function PersonalDetailsFields({
  values,
  onChange,
  errors = {},
  onErrorClear,
  dateOfBirthRequired = false,
}: PersonalDetailsFieldsProps) {
  const clearError = (field: string) => {
    onErrorClear?.(field);
  };

  const legalStatusDisplayValue =
    (STATUS_LABEL as Record<string, string>)[values.legalStatus] ?? values.legalStatus ?? ``;

  const passportCountryCode = getCountryCode(values.citizenOf || values.countryOfTaxResidence || ``);
  const passportPlaceholder = getPassportPlaceholder(passportCountryCode);

  return (
    <div className={formGridClass}>
      <FormInput
        label="First name"
        value={values.firstName}
        onChange={(v) => onChange(`firstName`, v)}
        error={errors.firstName}
        onErrorClear={() => clearError(`firstName`)}
      />
      <FormInput
        label="Last name"
        value={values.lastName}
        onChange={(v) => onChange(`lastName`, v)}
        error={errors.lastName}
        onErrorClear={() => clearError(`lastName`)}
      />

      <div className={formGridSpan2}>
        <CountrySelect
          label="Citizen of"
          value={values.citizenOf}
          onChange={(v) => onChange(`citizenOf`, v)}
          error={errors.citizenOf}
          onErrorClear={() => clearError(`citizenOf`)}
        />
      </div>

      <div className={formGridSpan2}>
        <CountrySelect
          label="Country of tax residence"
          value={values.countryOfTaxResidence}
          onChange={(v) => onChange(`countryOfTaxResidence`, v)}
          error={errors.countryOfTaxResidence}
          onErrorClear={() => clearError(`countryOfTaxResidence`)}
        />
      </div>

      <div className={formGridSpan2}>
        <FormSelect
          label="Legal Status"
          value={legalStatusDisplayValue}
          onChange={(v) => onChange(`legalStatus`, (LABEL_STATUS as Record<string, string>)[v] ?? v)}
          options={LEGAL_STATUS_OPTIONS}
          error={errors.legalStatus}
          onErrorClear={() => clearError(`legalStatus`)}
          placeholder="Select legal status..."
          isClearable={false}
        />
      </div>

      <div className={formGridSpan2}>
        <FormInput
          label="Tax ID"
          value={values.taxId}
          onChange={(v) => onChange(`taxId`, v)}
          error={errors.taxId}
          onErrorClear={() => clearError(`taxId`)}
        />
      </div>

      <div className={formGridSpan2}>
        <DateInput
          label="Date of birth"
          value={values.dateOfBirth}
          onChange={(v) => onChange(`dateOfBirth`, v || ``)}
          error={errors.dateOfBirth}
          onErrorClear={() => clearError(`dateOfBirth`)}
          placeholder="Select your date of birth"
          required={dateOfBirthRequired}
        />
      </div>

      <div className={formGridSpan2}>
        <FormInput
          label="Passport/ID number"
          value={values.passportOrIdNumber}
          onChange={(v) => onChange(`passportOrIdNumber`, v)}
          error={errors.passportOrIdNumber}
          onErrorClear={() => clearError(`passportOrIdNumber`)}
          placeholder={passportPlaceholder}
        />
      </div>

      <div className={formGridSpan2}>
        <PhoneInput
          label="Phone number"
          value={values.phoneNumber}
          onChange={(v) => onChange(`phoneNumber`, v ?? ``)}
          error={errors.phoneNumber}
          onErrorClear={() => clearError(`phoneNumber`)}
          defaultCountryName={values.countryOfTaxResidence || undefined}
        />
      </div>
    </div>
  );
}
