'use client';

import { useRouter } from 'next/navigation';

import { DocumentTextIcon, PaperPlaneIcon } from '@remoola/ui';

import localStyles from './ActionRow.module.css';
import styles from '../ui/classNames.module.css';

const { actionRowGrid, actionRowSubtitle, actionRowTitle } = styles;

export function ActionRow() {
  const router = useRouter();

  return (
    <section className={actionRowGrid} data-testid="consumer-dashboard-action-row">
      <div className={localStyles.cardBlue} data-testid="consumer-dashboard-action-create-request">
        <div className={localStyles.rowInner}>
          <span className={localStyles.iconWrapBlue}>
            <DocumentTextIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className={actionRowTitle}>Create Payment Request</p>
            <p className={actionRowSubtitle}>Send an invoice-like request in minutes.</p>
          </div>
        </div>
        <button
          type="button"
          data-testid="consumer-dashboard-btn-create-request"
          onClick={(e) => (e.preventDefault(), e.stopPropagation(), router.push(`/payment-requests/new`))}
          className={localStyles.createButton}
        >
          Create
        </button>
      </div>

      <div className={localStyles.cardGreen} data-testid="consumer-dashboard-action-start-payment">
        <div className={localStyles.rowInner}>
          <span className={localStyles.iconWrapGreen}>
            <PaperPlaneIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className={actionRowTitle}>Start Payment</p>
            <p className={actionRowSubtitle}>One-off payment flow (card or bank).</p>
          </div>
        </div>
        <button
          type="button"
          data-testid="consumer-dashboard-btn-start-payment"
          onClick={(e) => (e.preventDefault(), e.stopPropagation(), router.push(`/payments/start`))}
          className={localStyles.payButton}
        >
          Pay
        </button>
      </div>
    </section>
  );
}
