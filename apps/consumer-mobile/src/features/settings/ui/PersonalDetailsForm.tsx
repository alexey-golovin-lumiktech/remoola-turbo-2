'use client';

import { useActionState, useState } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { DateInput } from '../../../shared/ui/DateInput';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { updatePersonalDetailsAction } from '../actions';
import { type Profile } from '../schemas';
import styles from './PersonalDetailsForm.module.css';

interface PersonalDetailsFormProps {
  profile: Profile;
}

const LEGAL_STATUS_OPTIONS = [
  { value: `INDIVIDUAL`, label: `Individual` },
  { value: `INDIVIDUAL_ENTREPRENEUR`, label: `Individual Entrepreneur` },
  { value: `SOLE_TRADER`, label: `Sole Trader` },
];

export function PersonalDetailsForm({ profile }: PersonalDetailsFormProps) {
  const pd = profile.personalDetails ?? {};
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    setFieldErrors({});
    const result = await updatePersonalDetailsAction(formData);

    if (!result.ok) {
      if (result.error.fields) {
        setFieldErrors(result.error.fields);
      }
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.PROFILE_UPDATE_FAILED)),
        { code: result.error.code },
      );
      return result;
    }

    showSuccessToast(`Personal details updated successfully`);
    return result;
  }, null);

  return (
    <FormCard title="Personal Details" description="Your personal information for compliance and verification purposes">
      <form action={formAction} className={styles.form}>
        <div className={styles.gridRow}>
          <FormField label="First Name" htmlFor="firstName" error={fieldErrors.firstName} required>
            <FormInput
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={pd.firstName ?? ``}
              error={!!fieldErrors.firstName}
              required
              className={styles.inputMinHeight}
            />
          </FormField>

          <FormField label="Last Name" htmlFor="lastName" error={fieldErrors.lastName} required>
            <FormInput
              id="lastName"
              name="lastName"
              type="text"
              defaultValue={pd.lastName ?? ``}
              error={!!fieldErrors.lastName}
              required
              className={styles.inputMinHeight}
            />
          </FormField>
        </div>

        <div className={styles.gridRow}>
          <FormField label="Country of Citizenship" htmlFor="citizenOf" error={fieldErrors.citizenOf} required>
            <FormInput
              id="citizenOf"
              name="citizenOf"
              type="text"
              defaultValue={pd.citizenOf ?? ``}
              error={!!fieldErrors.citizenOf}
              placeholder="e.g., United States"
              required
              className={styles.inputMinHeight}
            />
          </FormField>

          <FormField
            label="Country of Tax Residence"
            htmlFor="countryOfTaxResidence"
            error={fieldErrors.countryOfTaxResidence}
            required
          >
            <FormInput
              id="countryOfTaxResidence"
              name="countryOfTaxResidence"
              type="text"
              defaultValue={pd.countryOfTaxResidence ?? ``}
              error={!!fieldErrors.countryOfTaxResidence}
              placeholder="e.g., United States"
              required
              className={styles.inputMinHeight}
            />
          </FormField>
        </div>

        <FormField label="Legal Status" htmlFor="legalStatus" error={fieldErrors.legalStatus}>
          <FormSelect
            id="legalStatus"
            name="legalStatus"
            options={LEGAL_STATUS_OPTIONS}
            defaultValue={pd.legalStatus ?? ``}
            error={!!fieldErrors.legalStatus}
            placeholder="Select legal status"
            className={styles.inputMinHeight}
          />
        </FormField>

        <div className={styles.gridRow}>
          <FormField label="Tax ID" htmlFor="taxId" error={fieldErrors.taxId}>
            <FormInput
              id="taxId"
              name="taxId"
              type="text"
              defaultValue={pd.taxId ?? ``}
              error={!!fieldErrors.taxId}
              placeholder="Optional"
              className={styles.inputMinHeight}
            />
          </FormField>

          <FormField label="Date of Birth" htmlFor="dateOfBirth" error={fieldErrors.dateOfBirth}>
            <DateInput
              id="dateOfBirth"
              name="dateOfBirth"
              defaultValue={pd.dateOfBirth ?? ``}
              error={!!fieldErrors.dateOfBirth}
              max={new Date().toISOString().split(`T`)[0]}
              className={styles.inputMinHeight}
            />
          </FormField>
        </div>

        <div className={styles.gridRow}>
          <FormField label="Passport or ID Number" htmlFor="passportOrIdNumber" error={fieldErrors.passportOrIdNumber}>
            <FormInput
              id="passportOrIdNumber"
              name="passportOrIdNumber"
              type="text"
              defaultValue={pd.passportOrIdNumber ?? ``}
              error={!!fieldErrors.passportOrIdNumber}
              placeholder="Optional"
              className={styles.inputMinHeight}
            />
          </FormField>

          <FormField label="Phone Number" htmlFor="phoneNumber" error={fieldErrors.phoneNumber}>
            <FormInput
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={pd.phoneNumber ?? ``}
              error={!!fieldErrors.phoneNumber}
              placeholder="Optional"
              className={styles.inputMinHeight}
            />
          </FormField>
        </div>

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            className={styles.submitBtn}
          >
            {`Save Changes`}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
