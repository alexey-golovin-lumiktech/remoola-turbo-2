'use client';

import { useCallback, useEffect, useState } from 'react';

import { AddPaymentMethodModal, DeletePaymentMethodModal, EditPaymentMethodModal } from './modals';
import { PaymentMethodsList } from './PaymentMethodsList';
import { type PaymentMethodItem } from '../../types';
import { ErrorState, SkeletonTable } from '../ui';
import styles from '../ui/classNames.module.css';

const { pageHeaderRow, primaryActionButton } = styles;

export function PaymentMethodsPageClient() {
  const [payments, setPayments] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaymentMethodItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PaymentMethodItem | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/payment-methods`, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
      });

      if (!res.ok) {
        throw new Error(`Failed to load payment methods`);
      }

      const data = await res.json();
      setPayments(Array.isArray(data?.items) ? data.items : []);
      setHasLoadedOnce(true);
    } catch {
      setLoadError(`Something went wrong retrieving payment methods`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-5">
      <div className={pageHeaderRow}>
        <button
          onClick={(e) => (e.stopPropagation(), e.preventDefault(), setCreateOpen(true))}
          className={primaryActionButton}
        >
          + Add Payment Method
        </button>
      </div>

      {loadError ? (
        <ErrorState title="Failed to load payment methods" message={loadError} onRetry={() => void refresh()} />
      ) : !hasLoadedOnce && loading ? (
        <SkeletonTable rows={4} cols={2} />
      ) : (
        <PaymentMethodsList
          payments={payments}
          onEditAction={(paymentMethod) => setEditItem(paymentMethod)}
          onDeleteAction={(paymentMethod) => setDeleteItem(paymentMethod)}
        />
      )}

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
