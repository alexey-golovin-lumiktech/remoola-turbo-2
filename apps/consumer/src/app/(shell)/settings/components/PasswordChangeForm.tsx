'use client';
import { useState } from 'react';

import styles from '../../../../components/ui/classNames.module.css';

const { errorTextClass, formGrid, formSection, formSectionTitle, inputClass, inputLabel, primaryActionButton } =
  styles;

export function PasswordChangeForm({ reload }: any) {
  const [password, setPassword] = useState(``);
  const [confirm, setConfirm] = useState(``);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);

    if (password !== confirm) {
      setError(`Passwords do not match`);
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/profile/password`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError(`Failed to change password`);
    } else {
      setPassword(``);
      setConfirm(``);
    }

    setSaving(false);
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Change Password</h2>

      {error && <p className={errorTextClass}>{error}</p>}

      <div className={formGrid}>
        <div>
          <label className={inputLabel}>New Password</label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className={inputLabel}>Confirm Password</label>
          <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>

      <button disabled={saving} onClick={save} className={primaryActionButton}>
        {saving ? `Saving...` : `Change Password`}
      </button>
    </section>
  );
}
