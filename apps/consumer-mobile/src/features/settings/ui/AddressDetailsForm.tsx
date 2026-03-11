'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../../../shared/ui/Button';
import { FormCard } from '../../../shared/ui/FormCard';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { updateAddressDetailsAction } from '../actions';
import { type Profile } from '../schemas';

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
      toast.error(result.error.message);
      return result;
    }

    toast.success(`Address details updated successfully`);
    return result;
  }, null);

  return (
    <FormCard title="Address Details" description="Your residential or business address">
      <form action={formAction} className={`space-y-5`}>
        <FormField label="Street Address" htmlFor="street" error={fieldErrors.street} required>
          <FormInput
            id="street"
            name="street"
            type="text"
            defaultValue={ad.street ?? ``}
            error={!!fieldErrors.street}
            placeholder="123 Main Street"
            required
            className={`min-h-11`}
          />
        </FormField>

        <div className={`grid gap-4 sm:grid-cols-2`}>
          <FormField label="City" htmlFor="city" error={fieldErrors.city} required>
            <FormInput
              id="city"
              name="city"
              type="text"
              defaultValue={ad.city ?? ``}
              error={!!fieldErrors.city}
              placeholder="New York"
              required
              className={`min-h-11`}
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
              className={`min-h-11`}
            />
          </FormField>
        </div>

        <div className={`grid gap-4 sm:grid-cols-2`}>
          <FormField label="Postal Code" htmlFor="postalCode" error={fieldErrors.postalCode} required>
            <FormInput
              id="postalCode"
              name="postalCode"
              type="text"
              defaultValue={ad.postalCode ?? ``}
              error={!!fieldErrors.postalCode}
              placeholder="10001"
              required
              className={`min-h-11`}
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
