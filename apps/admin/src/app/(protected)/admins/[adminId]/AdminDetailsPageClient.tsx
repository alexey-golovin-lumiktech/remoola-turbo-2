'use client';

import { useEffect, useState } from 'react';

import { JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type AdminDetails } from '../../../../lib';

export function AdminDetailsPageClient({ adminId }: { adminId: string }) {
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);

  useEffect(() => {
    async function loadAdminDetails(adminId: string): Promise<AdminDetails | null> {
      const response = await fetch(`/api/admins/${adminId}`, {
        cache: `no-store`,
        credentials: `include`,
      });
      if (!response.ok) return null;
      return await response.json();
    }

    loadAdminDetails(adminId).then(setAdminDetails);
  }, [adminId]);

  if (!adminDetails) return <div className={styles.adminTextGray600}>Admin not found</div>;

  return (
    <div className={styles.adminPageStack}>
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
