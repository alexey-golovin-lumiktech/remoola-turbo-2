'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export function AddressDetailsForm({ profile, reload }: any) {
  const ad = profile.addressDetails ?? {};

  const [postalCode, setPostalCode] = useState(ad.postalCode ?? ``);
  const [country, setCountry] = useState(ad.country ?? ``);
  const [city, setCity] = useState(ad.city ?? ``);
  const [street, setStreet] = useState(ad.street ?? ``);
  const [state, setState] = useState(ad.state ?? ``);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/profile/update`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({
        addressDetails: { postalCode, country, city, street, state },
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Address Details</h2>

      <div className="form-grid">
        <div>
          <label className="input-label">Postal Code</label>
          <input className="input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>

        <div>
          <label className="input-label">Country</label>
          <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">City</label>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">Street</label>
          <input className="input" value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="input-label">State</label>
          <input className="input" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
      </div>

      <button
        disabled={saving}
        onClick={save}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500"
      >
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
