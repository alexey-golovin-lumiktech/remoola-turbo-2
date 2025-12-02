'use client';

import { useEffect, useState } from 'react';

import { AddPaymentMethodModal, DeletePaymentMethodModal, EditPaymentMethodModal } from './modals';
import { PaymentMethodsList } from './PaymentMethodsList';
import { type PaymentMethodItem } from '../../types';

export function PaymentMethodsPageClient() {
  const [payments, setPayments] = useState<PaymentMethodItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaymentMethodItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PaymentMethodItem | null>(null);

  async function refresh() {
    const res = await fetch(`/api/payment-methods`, {
      headers: { 'Content-Type': `application/json` },
      credentials: `include`,
      cache: `no-cache`,
    });
    const data = await res.json();
    setPayments(data.items || []);
  }

  useEffect(() => void refresh(), []);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Bank Accounts & Cards</h1>
          <p className="text-gray-500 text-sm">Manage your saved cards and bank accounts.</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
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
