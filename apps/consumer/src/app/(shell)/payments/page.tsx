import { type Metadata } from 'next';

import { PaymentsList } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Payments - Remoola`,
};

export default function PaymentsPage() {
  return (
    <div className={pageContainer}>
      <h1 className={pageTitle}>Payments</h1>
      <p className={pageSubtitle}>View your incoming and outgoing payments.</p>

      <PaymentsList />
    </div>
  );
}
