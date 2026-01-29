'use client';

import { useEffect, useState } from 'react';

import { AddPaymentMethodModal, DeletePaymentMethodModal, EditPaymentMethodModal } from './modals';
import { PaymentMethodsList } from './PaymentMethodsList';
import { type PaymentMethodItem } from '../../types';
import styles from '../ui/classNames.module.css';

const { pageHeaderRow, pageStackContainer, pageSubtitleGray, pageTitleGray, primaryActionButton } = styles;

export function PaymentMethodsPageClient() {
  const [payments, setPayments] = useState<PaymentMethodItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaymentMethodItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PaymentMethodItem | null>(null);

  async function refresh() {
    const res = await fetch(`/api/payment-methods`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    const data = await res.json();
    setPayments(data.items || []);
  }

  useEffect(() => void refresh(), []);

  return (
    <div className={pageStackContainer}>
      <div className={pageHeaderRow}>
        <div>
          <h1 className={pageTitleGray}>Bank Accounts & Cards</h1>
          <p className={pageSubtitleGray}>Manage your saved cards and bank accounts.</p>
        </div>

        <button
          onClick={(e) => (e.stopPropagation(), e.preventDefault(), setCreateOpen(true))}
          className={primaryActionButton}
        >
          + Add Payment Method
        </button>
      </div>

      <PaymentMethodsList
        payments={payments || []}
        onEditAction={(paymentMethod) => setEditItem(paymentMethod)}
        onDeleteAction={(paymentMethod) => setDeleteItem(paymentMethod)}
      />

      <AddPaymentMethodModal open={createOpen} onCloseAction={() => setCreateOpen(false)} onCreatedAction={refresh} />

      <EditPaymentMethodModal
        open={!!editItem}
        paymentMethod={editItem}
        onCloseAction={() => setEditItem(null)}
        onUpdatedAction={refresh}
      />

      <DeletePaymentMethodModal
        open={!!deleteItem}
        paymentMethod={deleteItem}
        onCloseAction={() => setDeleteItem(null)}
        onDeletedAction={refresh}
      />
    </div>
  );
}
