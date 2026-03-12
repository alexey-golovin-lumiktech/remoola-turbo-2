'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { PersonalDetailsFields, type PersonalDetailsValues } from '../../../../components/personal-details';
import styles from '../../../../components/ui/classNames.module.css';
import { toDateOnly } from '../../../../lib/date-utils';
import { getFieldErrors, personalDetailsSchema } from '../../../../lib/validation';
import { type ConsumerProfile, LABEL_STATUS } from '../../../../types';

const { formSection, formSectionTitle, primaryActionButton } = styles;

type PersonalDetailsFormProps = { profile: ConsumerProfile; reload: () => void | Promise<void> };

function toFormValues(pd: ConsumerProfile[`personalDetails`]): PersonalDetailsValues {
  const raw = pd ?? {};
  const legalStatusRaw = raw.legalStatus ?? ``;
  const legalStatus = legalStatusRaw
    ? ((LABEL_STATUS as Record<string, string>)[legalStatusRaw] ?? legalStatusRaw)
    : ``;
  return {
    firstName: raw.firstName ?? ``,
    lastName: raw.lastName ?? ``,
    citizenOf: raw.citizenOf ?? ``,
    countryOfTaxResidence: raw.countryOfTaxResidence ?? ``,
    legalStatus,
    taxId: raw.taxId ?? ``,
    dateOfBirth: toDateOnly(raw.dateOfBirth ?? ``),
    passportOrIdNumber: raw.passportOrIdNumber ?? ``,
    phoneNumber: raw.phoneNumber ?? ``,
  };
}

export function PersonalDetailsForm({ profile, reload }: PersonalDetailsFormProps) {
  const [values, setValues] = useState<PersonalDetailsValues>(() => toFormValues(profile.personalDetails));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof PersonalDetailsValues, value: string) => {
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
    const result = personalDetailsSchema.safeParse(values);
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
        personalDetails: {
          firstName: values.firstName,
          lastName: values.lastName,
          citizenOf: values.citizenOf,
          passportOrIdNumber: values.passportOrIdNumber,
          legalStatus: values.legalStatus || null,
          dateOfBirth: values.dateOfBirth || null,
          countryOfTaxResidence: values.countryOfTaxResidence,
          taxId: values.taxId,
          phoneNumber: values.phoneNumber,
        },
      }),
    });

    setSaving(false);

    if (!response.ok) {
      toast.error(`Failed to update personal information`);
      return;
    }

    toast.success(`Personal information updated successfully`);
    setFieldErrors({});
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Personal Details</h2>

      <PersonalDetailsFields
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

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
