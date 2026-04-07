'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '../lib';
import { Theme, useTheme } from './ThemeProvider';
import styles from './ui/classNames.module.css';

const themeLabels: Record<(typeof Theme)[keyof typeof Theme], string> = {
  [Theme.LIGHT]: `Light`,
  [Theme.DARK]: `Dark`,
  [Theme.SYSTEM]: `System`,
};

export function Topbar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  async function logout() {
    setLoading(true);
    await apiFetch(`/api/auth/logout`, { method: `POST` });
    router.push(`/login`);
    router.refresh();
  }

  return (
    <header className={styles.adminTopbar}>
      <div className={styles.adminTopbarTitle}>Admin Panel</div>
      <div className={styles.adminTopbarActions}>
        <label className={styles.adminTopbarThemeWrap}>
          <span className={styles.adminTopbarThemeLabel}>Theme</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as (typeof Theme)[keyof typeof Theme])}
            className={styles.adminTopbarTheme}
            aria-label="Admin theme"
          >
            {Object.values(Theme).map((option) => (
              <option key={option} value={option}>
                {themeLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <button disabled={loading} onClick={logout} className={styles.adminTopbarLogout}>
          {loading ? `Signing out...` : `Sign out`}
        </button>
      </div>
    </header>
  );
}
