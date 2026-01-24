'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import styles from '../../../../components/ui/classNames.module.css';

const { formGridClass, formGridSpan2, formSection, formSectionTitle, inputClass, inputLabel, primaryActionButton } =
  styles;

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
    <section className={formSection}>
      <h2 className={formSectionTitle}>Address Details</h2>

      <div className={formGridClass}>
        <div>
          <label className={inputLabel}>Postal Code</label>
          <input className={inputClass} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>

        <div>
          <label className={inputLabel}>Country</label>
          <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>City</label>
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>Street</label>
          <input className={inputClass} value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>

        <div className={formGridSpan2}>
          <label className={inputLabel}>State</label>
          <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
        </div>
      </div>

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Save Changes`}
      </button>
    </section>
  );
}
