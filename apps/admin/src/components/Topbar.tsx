'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiFetch } from '../lib';
import styles from './ui/classNames.module.css';

export function Topbar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await apiFetch(`/api/auth/logout`, { method: `POST` });
    router.push(`/login`);
    router.refresh();
  }

  return (
    <header className={styles.adminTopbar}>
      <div className={styles.adminTopbarTitle}>Admin Panel</div>
      <button disabled={loading} onClick={logout} className={styles.adminTopbarLogout}>
        {loading ? `Signing out...` : `Sign out`}
      </button>
    </header>
  );
}
