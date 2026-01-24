'use client';

import { type ConsumerContactAddress, type ConsumerContact } from '../../types';
import {
  emptyStateText,
  linkDanger,
  linkPrimary,
  tableBodyRowMuted,
  tableCellBodySimple,
  tableCellHeaderSimple,
  tableHeaderRowMuted,
  textMutedGrayStrong,
  textMutedMixed,
  textPrimary,
  textRight,
  textSm,
  spaceX3,
} from '../ui/classNames';

type ContactsTableProps = {
  items: ConsumerContact[];
  onDetailsAction: (contact: ConsumerContact) => void;
  onEditAction: (contact: ConsumerContact) => void;
  onDeleteAction: (contact: ConsumerContact) => void;
};

export function ContactsTable({ items, onDetailsAction, onEditAction, onDeleteAction }: ContactsTableProps) {
  return (
    <table className={`w-full ${textSm}`}>
      <thead>
        <tr className={tableHeaderRowMuted}>
          <th className={tableCellHeaderSimple}>Name</th>
          <th>Email</th>
          <th>Address</th>
          <th className={textRight}>Actions</th>
        </tr>
      </thead>

      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={4} className={emptyStateText}>
              No contacts found.
            </td>
          </tr>
        )}

        {items.map((c) => (
          <tr key={c.id} className={tableBodyRowMuted}>
            <td className={`${tableCellBodySimple} font-medium ${textPrimary}`}>{c.name ?? `—`}</td>
            <td className={textMutedGrayStrong}>{c.email}</td>
            <td className={textMutedMixed}>{shortAddress(c.address)}</td>

            <td className={`${textRight} ${spaceX3}`}>
              <button onClick={() => onDetailsAction(c)} className={linkPrimary}>
                Details
              </button>

              <button onClick={() => onEditAction(c)} className={linkPrimary}>
                Edit
              </button>

              <button onClick={() => onDeleteAction(c)} className={linkDanger}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function shortAddress(address: ConsumerContactAddress) {
  if (!address) return `—`;

  const line1 = [address.street, address.city].filter(Boolean).join(`, `);
  const line2 = [address.state, address.postalCode].filter(Boolean).join(` `);
  const line3 = address.country;

  return [line1, line2, line3].filter(Boolean).join(` • `);
}
