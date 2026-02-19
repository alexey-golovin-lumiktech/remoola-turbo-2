'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import styles from '../../../../components/ui/classNames.module.css';

const { formGrid, formSection, formSectionTitle, inputClass, inputLabel, primaryActionButton, spaceY6 } = styles;

export function PasswordChangeForm({ reload }: any) {
  const [password, setPassword] = useState(``);
  const [confirm, setConfirm] = useState(``);
  const [saving, setSaving] = useState(false);
  async function save(e?: React.FormEvent) {
    e?.preventDefault();

    if (password !== confirm) {
      toast.error(`Passwords do not match`);
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
      toast.error(`Failed to change password`);
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
