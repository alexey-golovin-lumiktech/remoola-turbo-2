'use client';

import { useEffect, useState } from 'react';

import { DataTable } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type Consumer } from '../../../lib';

export function ConsumersPageClient() {
  const [consumers, setConsumers] = useState<Consumer[]>([]);

  useEffect(() => {
    async function loadConsumers(): Promise<Consumer[]> {
      const response = await fetch(`/api/consumers`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return [];
      return await response.json();
    }

    loadConsumers().then(setConsumers);
  }, []);

  return (
    <div className={styles.adminPageStack}>
      <div>
        <h1 className={styles.adminPageTitle}>Consumers</h1>
        <p className={styles.adminPageSubtitle}>Consumer + joined details (personal/org/address/google).</p>
      </div>

      <DataTable<Consumer>
        rows={consumers}
        getRowKeyAction={(c) => c.id}
        rowHrefAction={(c) => `/consumers/${c.id}`}
        columns={[
          {
            key: `email`,
            header: `Email`,
            render: (c) => <span className={styles.adminTextMedium}>{c.email}</span>,
          },
          {
            key: `type`,
            header: `Account`,
            render: (c) => (
              <span>
                {c.accountType}
                {c.contractorKind ? ` / ${c.contractorKind}` : ``}
              </span>
            ),
          },
          {
            key: `verified`,
            header: `Verified`,
            render: (c) => <span>{String(c.verified ?? false)}</span>,
          },
          {
            key: `legal`,
            header: `Legal Verified`,
            render: (c) => <span>{String(c.legalVerified ?? false)}</span>,
          },
          {
            key: `created`,
            header: `Created`,
            render: (c) => <span className={styles.adminTextGray600}>{new Date(c.createdAt).toLocaleString()}</span>,
          },
        ]}
      />
    </div>
  );
}
