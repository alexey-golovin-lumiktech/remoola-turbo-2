'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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
    <section className="form-section">
      <h2 className="text-lg font-semibold">Personal Details</h2>

      <div className="form-grid">
        <div>
          <label className="input-label">First Name</label>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>

        <div>
          <label className="input-label">Last Name</label>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Citizen of</label>
          <input className="input" value={citizenOf} onChange={(e) => setCitizenOf(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Passport / ID Number</label>
          <input className="input" value={passportOrIdNumber} onChange={(e) => setPassportOrIdNumber(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Legal Status</label>
          <input className="input" value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Date Of Birth</label>
          <input className="input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Country Of Tax Residence</label>
          <input
            className="input"
            value={countryOfTaxResidence}
            onChange={(e) => setCountryOfTaxResidence(e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <label className="input-label">Tax ID</label>
          <input className="input" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Phone number</label>
          <input className="input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        </div>
      </div>

      <button disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
