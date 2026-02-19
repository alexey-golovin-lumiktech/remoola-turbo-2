'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CardSkeleton, JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type AdminDetails } from '../../../../lib';

export function AdminDetailsPageClient({ adminId }: { adminId: string }) {
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminDetails(adminId: string): Promise<AdminDetails | null> {
      const response = await fetch(`/api/admins/${adminId}`, {
        cache: `no-store`,
        credentials: `include`,
      });
      if (!response.ok) return null;
      return await response.json();
    }

    setLoading(true);
    loadAdminDetails(adminId).then((data) => {
      setAdminDetails(data);
      setLoading(false);
    });
  }, [adminId]);

  if (loading) {
    return (
      <div className={styles.adminPageStack}>
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!adminDetails) {
    return (
      <div className={styles.adminPageStack}>
        <div className={styles.adminTextGray600}>Admin not found</div>
        <Link href="/admins" className={styles.adminPrimaryButton}>
          Back to Admins
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminTextGray600} style={{ marginBottom: `0.5rem` }}>
        <Link href="/admins">← Back to Admins</Link>
      </div>
      <div>
        <div className={styles.adminTextGray500}>Admin</div>
        <h1 className={styles.adminPageTitle}>{adminDetails.email}</h1>
        <div className={styles.adminDetailMeta}>
          <JsonView value={adminDetails} />
        </div>
      </div>
    </div>
  );
}
