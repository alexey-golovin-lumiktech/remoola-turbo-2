'use client';

import { useState } from 'react';

import AddPaymentMethodModal from './modals/AddPaymentMethodModal';
import DeletePaymentMethodModal from './modals/DeletePaymentMethodModal';
import EditPaymentMethodModal from './modals/EditPaymentMethodModal';
import PaymentMethodsList from './PaymentMethodsList';
import { type PaymentMethodItem } from '../../types/payment-methods';

export default function PaymentMethodsPageClient({ initialItems }: { initialItems: PaymentMethodItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaymentMethodItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PaymentMethodItem | null>(null);

  async function refresh() {
    const res = await fetch(`/api/payment-methods`, {
      headers: { authorization: localStorage.getItem(`authorization`) || ``, 'Content-Type': `application/json` },
    });
    const data = await res.json();
    setItems(data.items);
  }

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
        items={items || []}
        onEditAction={(item) => setEditItem(item)}
        onDeleteAction={(item) => setDeleteItem(item)}
      />

      <AddPaymentMethodModal open={createOpen} onCloseAction={() => setCreateOpen(false)} onCreatedAction={refresh} />

      <EditPaymentMethodModal
        open={!!editItem}
        item={editItem}
        onCloseAction={() => setEditItem(null)}
        onUpdatedAction={refresh}
      />

      <DeletePaymentMethodModal
        open={!!deleteItem}
        item={deleteItem}
        onCloseAction={() => setDeleteItem(null)}
        onDeletedAction={refresh}
      />
    </div>
  );
}
