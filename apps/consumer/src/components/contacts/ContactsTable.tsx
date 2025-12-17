'use client';

import { type ConsumerContactAddress, type ConsumerContact } from '../../types';

type ContactsTableProps = {
  items: ConsumerContact[];
  onDetailsAction: (contact: ConsumerContact) => void;
  onEditAction: (contact: ConsumerContact) => void;
  onDeleteAction: (contact: ConsumerContact) => void;
};

export function ContactsTable({ items, onDetailsAction, onEditAction, onDeleteAction }: ContactsTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 border-b">
          <th className="py-3">Name</th>
          <th>Email</th>
          <th>Address</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>

      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center py-8 text-gray-400">
              No contacts found.
            </td>
          </tr>
        )}

        {items.map((c) => (
          <tr key={c.id} className="border-b last:border-none">
            <td className="py-3 font-medium">{c.name ?? `—`}</td>
            <td>{c.email}</td>
            <td className="text-gray-600">{shortAddress(c.address)}</td>

            <td className="text-right space-x-3">
              <button onClick={() => onDetailsAction(c)} className="text-blue-600 hover:underline">
                Details
              </button>

              <button onClick={() => onEditAction(c)} className="text-blue-600 hover:underline">
                Edit
              </button>

              <button onClick={() => onDeleteAction(c)} className="text-red-500 hover:underline">
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
