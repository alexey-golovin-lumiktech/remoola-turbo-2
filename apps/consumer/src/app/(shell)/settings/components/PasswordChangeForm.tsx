'use client';
import { useState } from 'react';

import styles from '../../../../components/ui/classNames.module.css';

const {
  errorTextClass,
  formGrid,
  formSection,
  formSectionTitle,
  inputClass,
  inputLabel,
  primaryActionButton,
  spaceY6,
} = styles;

export function PasswordChangeForm({ reload }: any) {
  const [password, setPassword] = useState(``);
  const [confirm, setConfirm] = useState(``);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
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

      <form onSubmit={save} className={spaceY6}>
        <input
          type="text"
          autoComplete="username"
          value=""
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          style={{ position: `absolute`, left: `-9999px`, width: `1px`, height: `1px`, opacity: 0 }}
        />
        <div className={formGrid}>
          <div>
            <label className={inputLabel}>New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className={inputLabel}>Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className={primaryActionButton}>
          {saving ? `Saving...` : `Change Password`}
        </button>
      </form>
    </section>
  );
}
