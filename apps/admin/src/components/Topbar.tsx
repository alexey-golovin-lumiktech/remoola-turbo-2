'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '../lib';
import { Theme, useTheme } from './ThemeProvider';
import styles from './ui/classNames.module.css';

export function Topbar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

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
        <button type="button" onClick={toggleTheme} className={styles.adminTopbarTheme}>
          {resolvedTheme === Theme.DARK ? `Switch to Light` : `Switch to Dark`}
        </button>
        <button disabled={loading} onClick={logout} className={styles.adminTopbarLogout}>
          {loading ? `Signing out...` : `Sign out`}
        </button>
      </div>
    </header>
  );
}
