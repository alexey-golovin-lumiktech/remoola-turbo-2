'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import { CONSUMER_ROLE } from '@remoola/api-types';

import { FormInput, FormSelect } from '../../../../components/ui';
import styles from '../../../../components/ui/classNames.module.css';
import { CONSUMER_ROLE_LABEL, LABEL_SIZE, SIZE_LABEL, type TOrganizationSizeLabel } from '../../../../types';
const { formSection, formSectionTitle, primaryActionButton } = styles;

interface OrganizationDetailsFormProps {
  profile: {
    organizationDetails?: {
      name?: string | null;
      size?: string | null;
      consumerRole?: string | null;
      consumerRoleOther?: string | null;
    } | null;
  };
  reload: () => void | Promise<void>;
}

const CONSUMER_ROLE_OPTIONS = [
  { value: CONSUMER_ROLE.FOUNDER, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.FOUNDER] },
  { value: CONSUMER_ROLE.FINANCE, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.FINANCE] },
  { value: CONSUMER_ROLE.MARKETING, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.MARKETING] },
  { value: CONSUMER_ROLE.CUSTOMER_SUPPORT, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.CUSTOMER_SUPPORT] },
  { value: CONSUMER_ROLE.SALES, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.SALES] },
  { value: CONSUMER_ROLE.LEGAL, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.LEGAL] },
  { value: CONSUMER_ROLE.HUMAN_RESOURCE, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.HUMAN_RESOURCE] },
  { value: CONSUMER_ROLE.OPERATIONS, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.OPERATIONS] },
  { value: CONSUMER_ROLE.COMPLIANCE, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.COMPLIANCE] },
  { value: CONSUMER_ROLE.PRODUCT, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.PRODUCT] },
  { value: CONSUMER_ROLE.ENGINEERING, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.ENGINEERING] },
  { value: CONSUMER_ROLE.ANALYSIS_DATA, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.ANALYSIS_DATA] },
  { value: CONSUMER_ROLE.OTHER, label: CONSUMER_ROLE_LABEL[CONSUMER_ROLE.OTHER] },
];

const SIZE_OPTIONS = [
  { value: `1-10 team members`, label: `1-10 team members` },
  { value: `11-100 team members`, label: `11-100 team members` },
  { value: `100+ team members`, label: `100+ team members` },
];

export function OrganizationDetailsForm({ profile, reload }: OrganizationDetailsFormProps) {
  const org = profile.organizationDetails ?? {};

  const [name, setName] = useState(org.name ?? ``);
  const [consumerRole, setConsumerRole] = useState<string>(org.consumerRole ?? ``);
  const [consumerRoleOther, setConsumerRoleOther] = useState(org.consumerRoleOther ?? ``);
  const [size, setSize] = useState<string>(org.size ?? ``);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/profile/update`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({
        organizationDetails: {
          name: name || null,
          consumerRole: consumerRole || null,
          consumerRoleOther: consumerRole === CONSUMER_ROLE.OTHER ? consumerRoleOther || null : null,
          size: size || null,
        },
      }),
    });

    setSaving(false);

    if (!response.ok) {
      toast.error(`Failed to update organization details`);
      return;
    }

    toast.success(`Organization details updated successfully`);
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Organization Details</h2>

      <FormInput label="Organization name" value={name} onChange={(value) => setName(value)} />

      <FormSelect
        label="Your Role In Organization"
        value={consumerRole}
        onChange={(value) => {
          setConsumerRole(value);
          if (value !== CONSUMER_ROLE.OTHER) setConsumerRoleOther(``);
        }}
        options={CONSUMER_ROLE_OPTIONS}
        placeholder="Select or search role..."
        isClearable
      />

      {consumerRole === CONSUMER_ROLE.OTHER && (
        <FormInput
          label="Your role (other)"
          value={consumerRoleOther}
          onChange={(value) => setConsumerRoleOther(value)}
        />
      )}

      <FormSelect
        label="Your Organization Size"
        value={size ? (SIZE_LABEL[size as keyof typeof SIZE_LABEL] ?? size) : ``}
        onChange={(value) => setSize(LABEL_SIZE[value as TOrganizationSizeLabel] ?? ``)}
        options={SIZE_OPTIONS}
        placeholder="Select or search size..."
        isClearable
      />

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
