'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { type ConsumerContractItem } from '../../types';

export function ContractsTable() {
  const [contracts, setContracts] = useState<ConsumerContractItem[]>([]);

  useEffect(() => {
    const loadContracts = async () => {
      const response = await fetch(`/api/contracts`, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
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
        <tr className="text-left text-gray-400 dark:text-slate-400 border-b border-gray-200 dark:border-slate-600">
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
            <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-slate-400">
              You have no contractors yet.
            </td>
          </tr>
        )}

        {contracts.map((row) => (
          <tr key={row.id} className="border-b border-gray-200 dark:border-slate-600 last:border-none hover:bg-gray-50 dark:hover:bg-slate-700/50">
            <td className="py-3 text-gray-900 dark:text-white">{row.name}</td>
            <td className="capitalize text-gray-700 dark:text-slate-300">{row.lastStatus ?? `—`}</td>
            <td className="text-gray-700 dark:text-slate-300">{row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : `—`}</td>
            <td className="text-gray-700 dark:text-slate-300">{row.docs}</td>
            <td className="text-right">
              {row.lastRequestId ? (
                <Link href={`/payments/${row.lastRequestId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  View
                </Link>
              ) : (
                <span className="text-gray-400 dark:text-slate-400">No payments</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
