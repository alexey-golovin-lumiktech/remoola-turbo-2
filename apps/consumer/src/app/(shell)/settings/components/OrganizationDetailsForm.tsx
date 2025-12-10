'use client';
import { useState } from 'react';
import { toast } from 'sonner';

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
    <section className="form-section">
      <h2 className="text-lg font-semibold">Organization Details</h2>

      <div className="form-grid">
        <div className="col-span-2">
          <label className="input-label">Organization Name</label>
          <input className="input" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
        </div>

        <div>
          <label className="input-label">Organization Size</label>
          <input className="input" value={organizationSize} onChange={(e) => setOrganizationSize(e.target.value)} />
        </div>

        <div>
          <label className="input-label">Legal Status</label>
          <input className="input" value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Registration Number</label>
          <input className="input" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
        </div>
      </div>

      <button disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
