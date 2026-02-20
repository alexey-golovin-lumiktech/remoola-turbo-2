'use client';

import { type ConsumerContactAddress, type ConsumerContact } from '../../types';
import { DataTable, type Column } from '../ui';
import styles from '../ui/classNames.module.css';

const {
  linkDanger,
  linkPrimary,
  tableCellBodyMd,
  tableCellHeaderMd,
  textMutedGrayStrong,
  textMutedMixed,
  textPrimary,
  textRight,
} = styles;

type ContactsTableProps = {
  items: ConsumerContact[];
  onDetailsAction: (contact: ConsumerContact) => void;
  onEditAction: (contact: ConsumerContact) => void;
  onDeleteAction: (contact: ConsumerContact) => void;
};

export function ContactsTable({ items, onDetailsAction, onEditAction, onDeleteAction }: ContactsTableProps) {
  const columns: Column<ConsumerContact>[] = [
    {
      key: `name`,
      header: `Name`,
      headerClassName: tableCellHeaderMd,
      className: tableCellBodyMd,
      render: (contact) => <span className={`font-medium ${textPrimary}`}>{contact.name ?? `—`}</span>,
    },
    {
      key: `email`,
      header: `Email`,
      headerClassName: tableCellHeaderMd,
      className: tableCellBodyMd,
      render: (contact) => <span className={textMutedGrayStrong}>{contact.email}</span>,
    },
    {
      key: `address`,
      header: `Address`,
      headerClassName: tableCellHeaderMd,
      className: tableCellBodyMd,
      render: (contact) => <span className={textMutedMixed}>{shortAddress(contact.address)}</span>,
    },
    {
      key: `actions`,
      header: `Actions`,
      headerClassName: tableCellHeaderMd,
      className: `${tableCellBodyMd} ${textRight}`,
      render: (contact) => (
        <div className={`space-x-3`}>
          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onDetailsAction(contact))}
            className={linkPrimary}
          >
            Details
          </button>

          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onEditAction(contact))}
            className={linkPrimary}
          >
            Edit
          </button>

          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onDeleteAction(contact))}
            className={linkDanger}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={items}
      columns={columns}
      emptyMessage="No contacts found."
      keyExtractor={(contact) => contact.id}
    />
  );
}

function shortAddress(address: ConsumerContactAddress) {
  if (!address) return `—`;

  const line1 = [address.street, address.city].filter(Boolean).join(`, `);
  const line2 = [address.state, address.postalCode].filter(Boolean).join(` `);
  const line3 = address.country;

  return [line1, line2, line3].filter(Boolean).join(` • `);
}
