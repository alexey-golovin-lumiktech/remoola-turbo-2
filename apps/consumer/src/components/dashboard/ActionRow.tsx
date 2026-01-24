'use client';

import { useRouter } from 'next/navigation';

import styles from '../ui/classNames.module.css';

const { actionRowButton, actionRowCard, actionRowGrid, actionRowSubtitle, actionRowTitle } = styles;

export function ActionRow() {
  const router = useRouter();

  return (
    <section className={actionRowGrid}>
      <div className={actionRowCard}>
        <div>
          <p className={actionRowTitle}>Create Payment Request</p>
          <p className={actionRowSubtitle}>Send an invoice-like request in minutes.</p>
        </div>
        <button type="button" onClick={() => router.push(`/payment-requests/new`)} className={actionRowButton}>
          Create
        </button>
      </div>

      <div className={actionRowCard}>
        <div>
          <p className={actionRowTitle}>Start Payment</p>
          <p className={actionRowSubtitle}>One-off payment flow (card or bank).</p>
        </div>
        <button type="button" onClick={() => router.push(`/payments/start`)} className={actionRowButton}>
          Pay
        </button>
      </div>
    </section>
  );
}
