'use client';

import { useEffect, useState } from 'react';

import { DataTable } from '../../../components';
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Consumers</h1>
        <p className="text-sm text-gray-600">Consumer + joined details (personal/org/address/google).</p>
      </div>

      <DataTable<Consumer>
        rows={consumers}
        getRowKeyAction={(c) => c.id}
        rowHrefAction={(c) => `/consumers/${c.id}`}
        columns={[
          {
            key: `email`,
            header: `Email`,
            render: (c) => <span className="font-medium">{c.email}</span>,
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
            render: (c) => <span className="text-gray-600">{new Date(c.createdAt).toLocaleString()}</span>,
          },
        ]}
      />
    </div>
  );
}
