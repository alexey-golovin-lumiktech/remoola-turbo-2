'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import styles from '../../../../components/ui/classNames.module.css';

const { formGridClass, formGridSpan2, formSection, formSectionTitle, inputClass, inputLabel, primaryActionButton } =
  styles;

export function PersonalDetailsForm({ profile, reload }: any) {
  const pd = profile.personalDetails ?? {};

  const [firstName, setFirstName] = useState(pd.firstName ?? ``);
  const [lastName, setLastName] = useState(pd.lastName ?? ``);
  const [citizenOf, setCitizenOf] = useState(pd.citizenOf ?? ``);
  const [passportOrIdNumber, setPassportOrIdNumber] = useState(pd.passportOrIdNumber ?? ``);

  const [legalStatus, setLegalStatus] = useState(pd.legalStatus ?? ``);
  const [dateOfBirth, setDateOfBirth] = useState(pd.dateOfBirth ?? ``);
  const [countryOfTaxResidence, setCountryOfTaxResidence] = useState(pd.countryOfTaxResidence ?? ``);
  const [taxId, setTaxId] = useState(pd.taxId ?? ``);
  const [phoneNumber, setPhoneNumber] = useState(pd.phoneNumber ?? ``);

  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/profile/update`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({
        personalDetails: {
          firstName,
          lastName,
          citizenOf,
          passportOrIdNumber,
          legalStatus,
          dateOfBirth,
          countryOfTaxResidence,
          taxId,
          phoneNumber,
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
      <h2 className={formSectionTitle}>Personal Details</h2>

      <div className={formGridClass}>
        <div>
          <label className={inputLabel}>First Name</label>
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>

        <div>
          <label className={inputLabel}>Last Name</label>
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Citizen of</label>
          <input className={inputClass} value={citizenOf} onChange={(e) => setCitizenOf(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Passport / ID Number</label>
          <input
            className={inputClass}
            value={passportOrIdNumber}
            onChange={(e) => setPassportOrIdNumber(e.target.value)}
          />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Legal Status</label>
          <input className={inputClass} value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Date Of Birth</label>
          <input className={inputClass} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Country Of Tax Residence</label>
          <input
            className={inputClass}
            value={countryOfTaxResidence}
            onChange={(e) => setCountryOfTaxResidence(e.target.value)}
          />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Tax ID</label>
          <input className={inputClass} value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Phone number</label>
          <input className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        </div>
      </div>

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
