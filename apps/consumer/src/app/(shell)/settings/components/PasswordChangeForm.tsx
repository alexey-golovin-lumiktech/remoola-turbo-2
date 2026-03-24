'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import { AUTH_NOTICE_QUERY } from '@remoola/api-types';

import localStyles from './PasswordChangeForm.module.css';
import styles from '../../../../components/ui/classNames.module.css';

const { formGrid, formSection, formSectionTitle, inputClass, inputLabel, primaryActionButton } = styles;

type PasswordChangeFormProps = { reload: () => void | Promise<void> };

export function PasswordChangeForm({ reload }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState(``);
  const [password, setPassword] = useState(``);
  const [confirm, setConfirm] = useState(``);
  const [saving, setSaving] = useState(false);
  async function save(e?: React.FormEvent) {
    e?.preventDefault();

    if (!currentPassword.trim()) {
      toast.error(`Please enter your current password.`);
      return;
    }
    if (!password.trim() || !confirm.trim()) {
      toast.error(`Please enter and confirm your new password.`);
      return;
    }
    if (password.length < 8) {
      toast.error(`Your password must be at least 8 characters long.`);
      return;
    }
    if (password !== confirm) {
      toast.error(`Passwords do not match`);
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/profile/password`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      body: JSON.stringify({ currentPassword: currentPassword.trim(), password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const code = data?.code ?? data?.message;
      toast.error(code === `CURRENT_PASSWORD_INVALID` ? `Current password is incorrect.` : `Failed to change password`);
    } else {
      setCurrentPassword(``);
      setPassword(``);
      setConfirm(``);
      window.location.assign(`/logout?${AUTH_NOTICE_QUERY}=password_changed`);
      return;
    }

    setSaving(false);
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Change Password</h2>

      <form onSubmit={save} className={localStyles.formStack}>
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
            <label className={inputLabel}>Current Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Your current password"
            />
          </div>

          <div>
            <label className={inputLabel}>New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className={inputLabel}>Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
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
