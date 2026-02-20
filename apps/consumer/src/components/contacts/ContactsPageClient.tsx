'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ContactsTable } from './ContactsTable';
import { CreateContactModal, DeleteContactModal, EditContactModal } from './modals';
import { type ConsumerContact } from '../../types';
import { ErrorState, PaginationBar } from '../ui';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const { contactsAddButton, filterRowControlHeight, filterRowWrapAlignEnd, spaceY6 } = styles;

export function ContactsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<ConsumerContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialEmail, setCreateInitialEmail] = useState<string | null>(null);
  const [returnToPath, setReturnToPath] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<ConsumerContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<ConsumerContact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const response = await fetch(`/api/contacts?${params}`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    setLoading(false);
    if (!response.ok) {
      setLoadError(`Something went wrong retrieving contacts`);
      return;
    }
    const json = await response.json();
    setItems(json.items ?? []);
    setTotal(Number(json?.total ?? 0));
  }, [page, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get(`create`) === `1`;
    if (!shouldOpenCreate) return;

    const prefillEmail = searchParams.get(`email`);
    const returnTo = searchParams.get(`returnTo`);

    setCreateInitialEmail(prefillEmail);
    setReturnToPath(returnTo);
    setCreateOpen(true);
    router.replace(`/contacts`);
  }, [searchParams, router]);

  if (loadError) {
    return (
      <div data-testid="consumer-contacts-page-client">
        <ErrorState title="Failed to load contacts" message={loadError} onRetry={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className={spaceY6} data-testid="consumer-contacts-page-client">
      <div className={filterRowWrapAlignEnd}>
        <div className={filterRowControlHeight}>
          <button
            data-testid="consumer-contacts-btn-add"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCreateInitialEmail(null);
              setReturnToPath(null);
              setCreateOpen(true);
            }}
            className={contactsAddButton}
          >
            + Add Contact
          </button>
        </div>
      </div>

      {total > 0 && (
        <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} loading={loading} />
      )}

      <ContactsTable
        items={items}
        onEditAction={(contact) => setEditContact(contact)}
        onDeleteAction={(contact) => setDeleteContact(contact)}
        onDetailsAction={(contact) => router.push(`contacts/${contact.id}/details`)}
      />

      {/* Modals */}
      <CreateContactModal
        open={createOpen}
        initialEmail={createInitialEmail}
        onCloseAction={() => {
          setCreateOpen(false);
          setCreateInitialEmail(null);
          setReturnToPath(null);
        }}
        onCreatedAction={async () => {
          setPage(1);
          await refresh();
          if (returnToPath) {
            router.push(returnToPath);
            return;
          }
          setReturnToPath(null);
        }}
      />

      <EditContactModal
        open={!!editContact}
        contact={editContact}
        onCloseAction={() => setEditContact(null)}
        onUpdatedAction={refresh}
      />

      <DeleteContactModal
        open={!!deleteContact}
        contact={deleteContact}
        onCloseAction={() => setDeleteContact(null)}
        onDeletedAction={refresh}
      />
    </div>
  );
}
