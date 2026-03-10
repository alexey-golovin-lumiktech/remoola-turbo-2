'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../../shared/ui/Button';
import { DateInput } from '../../../shared/ui/DateInput';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { updatePersonalDetailsAction } from '../actions';

import type { Profile } from '../schemas';

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
      toast.error(result.error.message);
      return result;
    }

    toast.success(`Personal details updated successfully`);
    return result;
  }, null);

  return (
    <FormCard title="Personal Details" description="Your personal information for compliance and verification purposes">
      <form action={formAction} className={`space-y-5`}>
        <div className={`grid gap-4 sm:grid-cols-2`}>
          <FormField label="First Name" htmlFor="firstName" error={fieldErrors.firstName} required>
            <FormInput
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={pd.firstName ?? ``}
              error={!!fieldErrors.firstName}
              required
              className={`min-h-11`}
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
              className={`min-h-11`}
            />
          </FormField>
        </div>

        <div className={`grid gap-4 sm:grid-cols-2`}>
          <FormField label="Country of Citizenship" htmlFor="citizenOf" error={fieldErrors.citizenOf} required>
            <FormInput
              id="citizenOf"
              name="citizenOf"
              type="text"
              defaultValue={pd.citizenOf ?? ``}
              error={!!fieldErrors.citizenOf}
              placeholder="e.g., United States"
              required
              className={`min-h-11`}
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
              className={`min-h-11`}
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
            className={`min-h-11`}
          />
        </FormField>

        <div className={`grid gap-4 sm:grid-cols-2`}>
          <FormField label="Tax ID" htmlFor="taxId" error={fieldErrors.taxId}>
            <FormInput
              id="taxId"
              name="taxId"
              type="text"
              defaultValue={pd.taxId ?? ``}
              error={!!fieldErrors.taxId}
              placeholder="Optional"
              className={`min-h-11`}
            />
          </FormField>

          <FormField label="Date of Birth" htmlFor="dateOfBirth" error={fieldErrors.dateOfBirth}>
            <DateInput
              id="dateOfBirth"
              name="dateOfBirth"
              defaultValue={pd.dateOfBirth ?? ``}
              error={!!fieldErrors.dateOfBirth}
              max={new Date().toISOString().split(`T`)[0]}
              className={`min-h-11`}
            />
          </FormField>
        </div>

        <div className={`grid gap-4 sm:grid-cols-2`}>
          <FormField label="Passport or ID Number" htmlFor="passportOrIdNumber" error={fieldErrors.passportOrIdNumber}>
            <FormInput
              id="passportOrIdNumber"
              name="passportOrIdNumber"
              type="text"
              defaultValue={pd.passportOrIdNumber ?? ``}
              error={!!fieldErrors.passportOrIdNumber}
              placeholder="Optional"
              className={`min-h-11`}
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
              className={`min-h-11`}
            />
          </FormField>
        </div>

        <div className={`flex justify-end pt-2`}>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            className={`
              min-h-11
              shadow-lg
              shadow-primary-500/30
              hover:shadow-xl
              hover:shadow-primary-500/40
            `}
          >
            {isPending ? `Saving...` : `Save Changes`}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}
