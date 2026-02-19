'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatDateForDisplay } from '../../lib/date-utils';
import { type ConsumerContractItem } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  emptyStateText,
  linkPrimary,
  tableBodyRowMutedStrong,
  tableCellBodySimple,
  tableCellHeaderSimple,
  tableHeaderRowMutedAlt,
  textCapitalize,
  textMutedGrayAlt,
  textMutedSlate,
  textPrimary,
  textRight,
  textSm,
} = styles;

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
    <table className={`w-full ${textSm}`} data-testid="consumer-contracts-table">
      <thead>
        <tr className={tableHeaderRowMutedAlt}>
          <th className={tableCellHeaderSimple}>Contractor</th>
          <th>Status</th>
          <th>Last activity</th>
          <th>Documents</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        {(!contracts || contracts.length === 0) && (
          <tr>
            <td colSpan={5} className={emptyStateText}>
              You have no contractors yet.
            </td>
          </tr>
        )}

        {contracts.map((row) => (
          <tr key={row.id} className={tableBodyRowMutedStrong}>
            <td className={`${tableCellBodySimple} ${textPrimary}`}>{row.name}</td>
            <td className={`${textCapitalize} ${textMutedGrayAlt}`}>{row.lastStatus ?? `—`}</td>
            <td className={textMutedGrayAlt}>{row.lastActivity ? formatDateForDisplay(row.lastActivity) : `—`}</td>
            <td className={textMutedGrayAlt}>{row.docs}</td>
            <td className={textRight}>
              {row.lastRequestId ? (
                <Link href={`/payments/${row.lastRequestId}`} className={linkPrimary}>
                  View
                </Link>
              ) : (
                <span className={textMutedSlate}>No payments</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
