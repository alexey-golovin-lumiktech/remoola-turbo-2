'use client';

import { type ConsumerContactAddress, type ConsumerContact } from '../../types';
import { DataTable, SkeletonTable, type Column } from '../ui';
import localStyles from './ContactsTable.module.css';
import styles from '../ui/classNames.module.css';

const { tableCellBodyMd, tableCellHeaderMd, textMutedGrayStrong, textMutedMixed } = styles;

type ContactsTableProps = {
  items: ConsumerContact[];
  loading: boolean;
  onDetailsAction: (contact: ConsumerContact) => void;
  onEditAction: (contact: ConsumerContact) => void;
  onDeleteAction: (contact: ConsumerContact) => void;
};

export function ContactsTable({ items, loading, onDetailsAction, onEditAction, onDeleteAction }: ContactsTableProps) {
  const columns: Column<ConsumerContact>[] = [
    {
      key: `name`,
      header: `Name`,
      headerClassName: tableCellHeaderMd,
      className: tableCellBodyMd,
      render: (contact) => <span className={localStyles.nameCell}>{contact.name ?? `—`}</span>,
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
      className: localStyles.actionsCell,
      render: (contact) => (
        <div className={localStyles.actionsRow}>
          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onDetailsAction(contact))}
            className={localStyles.actionLinkPrimary}
          >
            Details
          </button>

          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onEditAction(contact))}
            className={localStyles.actionLinkPrimary}
          >
            Edit
          </button>

          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onDeleteAction(contact))}
            className={localStyles.actionLinkDanger}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <SkeletonTable rows={8} cols={4} />;
  }

  return (
    <>
      <div className={localStyles.mobileList} data-testid="consumer-contacts-mobile-list">
        {items.length === 0 ? (
          <div className={localStyles.mobileEmptyState}>No contacts found.</div>
        ) : (
          items.map((contact) => {
            const displayName = contact.name?.trim() || `No name provided`;
            const address = shortAddress(contact.address);

            return (
              <article key={contact.id} className={localStyles.mobileCard}>
                <div className={localStyles.mobileHeader}>
                  <div className={localStyles.mobileIdentity}>
                    <div className={localStyles.mobileName}>{displayName}</div>
                    <div className={localStyles.mobileEmail}>{contact.email}</div>
                  </div>
                </div>

                <div className={localStyles.mobileMetaGrid}>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Name</div>
                    <div className={localStyles.mobileMetaValue}>{displayName}</div>
                  </div>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Address</div>
                    <div className={localStyles.mobileMetaValue}>{address}</div>
                  </div>
                </div>

                <div className={localStyles.mobileActions}>
                  <button
                    onClick={(e) => (e.preventDefault(), e.stopPropagation(), onDetailsAction(contact))}
                    className={localStyles.mobileActionLinkPrimary}
                  >
                    Details
                  </button>
                  <button
                    onClick={(e) => (e.preventDefault(), e.stopPropagation(), onEditAction(contact))}
                    className={localStyles.mobileActionLinkPrimary}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => (e.preventDefault(), e.stopPropagation(), onDeleteAction(contact))}
                    className={localStyles.mobileActionLinkDanger}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className={localStyles.desktopTableWrapper} data-testid="consumer-contacts-table">
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No contacts found."
          keyExtractor={(contact) => contact.id}
        />
      </div>
    </>
  );
}

function shortAddress(address: ConsumerContactAddress) {
  if (!address) return `—`;

  const line1 = [address.street, address.city].filter(Boolean).join(`, `);
  const line2 = [address.state, address.postalCode].filter(Boolean).join(` `);
  const line3 = address.country;

  return [line1, line2, line3].filter(Boolean).join(` • `);
}
