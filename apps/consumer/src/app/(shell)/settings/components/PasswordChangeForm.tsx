'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import { AUTH_NOTICE_QUERY } from '@remoola/api-types';

import localStyles from './PasswordChangeForm.module.css';
import styles from '../../../../components/ui/classNames.module.css';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

const { formGrid, formSection, formSectionTitle, inputClass, inputLabel, primaryActionButton } = styles;

type PasswordChangeFormProps = {
  reload: () => void | Promise<void>;
  hasPassword: boolean;
};

export function PasswordChangeForm({ reload, hasPassword }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState(``);
  const [password, setPassword] = useState(``);
  const [confirm, setConfirm] = useState(``);
  const [saving, setSaving] = useState(false);

  const title = hasPassword ? `Change Password` : `Set Password`;
  const submitLabel = hasPassword ? `Change Password` : `Create Password`;
  const successNotice = hasPassword ? `password_changed` : `password_set`;
  const helperText = hasPassword
    ? null
    : `You sign in with Google today. Add a password here if you also want to sign in with email and password.`;

  async function save(e?: React.FormEvent) {
    e?.preventDefault();

    if (hasPassword && !currentPassword.trim()) {
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
      body: JSON.stringify({
        ...(hasPassword ? { currentPassword: currentPassword.trim() } : {}),
        password,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const code = data?.code ?? data?.message;
      toast.error(getErrorMessageForUser(code, getLocalToastMessage(localToastKeys.PASSWORD_CHANGE_FAILED)));
    } else {
      setCurrentPassword(``);
      setPassword(``);
      setConfirm(``);
      window.location.assign(`/logout?${AUTH_NOTICE_QUERY}=${successNotice}`);
      return;
    }

    setSaving(false);
    reload();
  }

  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>{title}</h2>
      {helperText ? <p className={localStyles.helperText}>{helperText}</p> : null}

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
          {hasPassword ? (
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
          ) : null}

          <div>
            <label className={inputLabel}>{hasPassword ? `New Password` : `Password`}</label>
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
          {saving ? `Saving...` : submitLabel}
        </button>
      </form>
    </section>
  );
}
