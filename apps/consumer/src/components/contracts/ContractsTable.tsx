'use client';

import Link from 'next/link';

import { type ConsumerContractItem } from '../../types';

interface Props {
  items: ConsumerContractItem[];
}

export default function ContractsTable({ items }: Props) {
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
        {(!items || items.length === 0) && (
          <tr>
            <td colSpan={5} className="text-center py-8 text-gray-400">
              You have no contractors yet.
            </td>
          </tr>
        )}

        {items.map((row) => (
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
