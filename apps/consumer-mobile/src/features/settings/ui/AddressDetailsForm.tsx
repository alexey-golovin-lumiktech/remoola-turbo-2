'use client';

import { useActionState, useState } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { updateAddressDetailsAction } from '../actions';
import { type Profile } from '../schemas';
import styles from './AddressDetailsForm.module.css';

interface AddressDetailsFormProps {
  profile: Profile;
}

export function AddressDetailsForm({ profile }: AddressDetailsFormProps) {
  const ad = profile.addressDetails ?? {};
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    setFieldErrors({});
    const result = await updateAddressDetailsAction(formData);

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

    showSuccessToast(`Address details updated successfully`);
    return result;
  }, null);

  return (
    <FormCard title="Address Details" description="Your residential or business address">
      <form action={formAction} className={styles.form}>
        <FormField label="Street Address" htmlFor="street" error={fieldErrors.street} required>
          <FormInput
            id="street"
            name="street"
            type="text"
            defaultValue={ad.street ?? ``}
            error={!!fieldErrors.street}
            placeholder="123 Main Street"
            required
            className={styles.inputMinHeight}
          />
        </FormField>

        <div className={styles.gridRow}>
          <FormField label="City" htmlFor="city" error={fieldErrors.city} required>
            <FormInput
              id="city"
              name="city"
              type="text"
              defaultValue={ad.city ?? ``}
              error={!!fieldErrors.city}
              placeholder="New York"
              required
              className={styles.inputMinHeight}
            />
          </FormField>

          <FormField label="State/Province" htmlFor="state" error={fieldErrors.state}>
            <FormInput
              id="state"
              name="state"
              type="text"
              defaultValue={ad.state ?? ``}
              error={!!fieldErrors.state}
              placeholder="NY"
              className={styles.inputMinHeight}
            />
          </FormField>
        </div>

        <div className={styles.gridRow}>
          <FormField label="Postal Code" htmlFor="postalCode" error={fieldErrors.postalCode} required>
            <FormInput
              id="postalCode"
              name="postalCode"
              type="text"
              defaultValue={ad.postalCode ?? ``}
              error={!!fieldErrors.postalCode}
              placeholder="10001"
              required
              className={styles.inputMinHeight}
            />
          </FormField>

          <FormField label="Country" htmlFor="country" error={fieldErrors.country} required>
            <FormInput
              id="country"
              name="country"
              type="text"
              defaultValue={ad.country ?? ``}
              error={!!fieldErrors.country}
              placeholder="United States"
              required
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
