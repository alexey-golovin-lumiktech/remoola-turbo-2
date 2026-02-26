'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { AddressDetailsFields, type AddressDetailsValues } from '../../../../components/address-details';
import styles from '../../../../components/ui/classNames.module.css';
import { addressDetailsSchema, getFieldErrors } from '../../../../lib/validation';
import { type ConsumerProfile } from '../../../../types';

const { formSection, formSectionTitle, formGridClass, primaryActionButton } = styles;

type AddressDetailsFormProps = { profile: ConsumerProfile; reload: () => void | Promise<void> };

function toFormValues(ad: ConsumerProfile[`addressDetails`]): AddressDetailsValues {
  const raw = ad ?? {};
  return {
    postalCode: raw.postalCode ?? ``,
    country: raw.country ?? ``,
    state: raw.state ?? ``,
    city: raw.city ?? ``,
    street: raw.street ?? ``,
  };
}

export function AddressDetailsForm({ profile, reload }: AddressDetailsFormProps) {
  const [values, setValues] = useState<AddressDetailsValues>(() => toFormValues(profile.addressDetails));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof AddressDetailsValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  async function save() {
    const result = addressDetailsSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/profile/update`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({
        addressDetails: {
          postalCode: values.postalCode,
          country: values.country,
          state: values.state,
          city: values.city,
          street: values.street,
        },
      }),
    });

    setSaving(false);

    if (!response.ok) {
      toast.error(`Failed to update address details`);
      return;
    }

    toast.success(`Address details updated successfully`);
    setFieldErrors({});
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Address Details</h2>

      <div className={formGridClass}>
        <AddressDetailsFields
          values={values}
          onChange={handleChange}
          errors={fieldErrors}
          onErrorClear={(field) =>
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next[field];
              return next;
            })
          }
        />
      </div>

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
