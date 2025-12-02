'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { type ConsumerContractItem } from '../../types';

export function ContractsTable() {
  const [contracts, setContracts] = useState<ConsumerContractItem[]>([]);

  useEffect(() => {
    const loadContracts = async () => {
      const response = await fetch(`/api/contracts`, {
        credentials: `include`,
        cache: `no-cache`,
      });
      if (!response.ok) throw new Error(`Fail to load contracts`);

      const json = await response.json();
      setContracts(json);
    };
    loadContracts();
  }, []);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 border-b">
          <th className="py-3">Contractor</th>
          <th>Status</th>
          <th>Last activity</th>
          <th>Documents</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        {(!contracts || contracts.length === 0) && (
          <tr>
            <td colSpan={5} className="text-center py-8 text-gray-400">
              You have no contractors yet.
            </td>
          </tr>
        )}

        {contracts.map((row) => (
          <tr key={row.id} className="border-b last:border-none">
            <td className="py-3">{row.name}</td>
            <td className="capitalize">{row.lastStatus ?? `—`}</td>
            <td>{row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : `—`}</td>
            <td>{row.docs}</td>
            <td className="text-right">
              {row.lastRequestId ? (
                <Link href={`/payments/${row.lastRequestId}`} className="text-blue-600 hover:underline">
                  View
                </Link>
              ) : (
                <span className="text-gray-400">No payments</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
