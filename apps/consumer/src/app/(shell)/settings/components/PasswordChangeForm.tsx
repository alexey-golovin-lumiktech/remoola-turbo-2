'use client';
import { useState } from 'react';

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
    <section className="form-section">
      <h2 className="text-lg font-semibold">Change Password</h2>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid gap-4">
        <div>
          <label className="input-label">New Password</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div>
          <label className="input-label">Confirm Password</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>

      <button disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
        {saving ? `Saving...` : `Change Password`}
      </button>
    </section>
  );
}
