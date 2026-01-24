'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  formGridClass,
  formGridSpan2,
  formSection,
  formSectionTitle,
  inputClass,
  inputLabel,
  primaryActionButton,
} from '../../../../components/ui/classNames';

export function OrganizationDetailsForm({ profile, reload }: any) {
  const org = profile.organizationDetails ?? {};

  const [organizationName, setOrganizationName] = useState(org.organizationName ?? ``);
  const [organizationSize, setOrganizationSize] = useState(org.organizationSize ?? ``);
  const [legalStatus, setLegalStatus] = useState(org.legalStatus ?? ``);
  const [registrationNumber, setRegistrationNumber] = useState(org.registrationNumber ?? ``);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/profile/update`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({
        organizationDetails: {
          organizationName,
          organizationSize,
          legalStatus,
          registrationNumber,
        },
      }),
    });

    setSaving(false);

    if (!response.ok) {
      toast.error(`Failed to update personal information`);
      return;
    }

    toast.success(`Personal information updated successfully`);
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Organization Details</h2>

      <div className={formGridClass}>
        <div className={formGridSpan2}>
          <label className={inputLabel}>Organization Name</label>
          <input
            className={inputClass}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </div>

        <div>
          <label className={inputLabel}>Organization Size</label>
          <input
            className={inputClass}
            value={organizationSize}
            onChange={(e) => setOrganizationSize(e.target.value)}
          />
        </div>

        <div>
          <label className={inputLabel}>Legal Status</label>
          <input className={inputClass} value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Registration Number</label>
          <input
            className={inputClass}
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
          />
        </div>
      </div>

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
