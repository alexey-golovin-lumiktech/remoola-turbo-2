import { type Metadata } from 'next';

import { CreatePaymentRequestForm } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';

const { pageStackContainer, pageSubtitlePlain, pageTitlePlain, startPaymentCard } = styles;

export const metadata: Metadata = {
  title: `Create Payment Request – Remoola`,
};

export default function CreatePaymentRequestPage() {
  return (
    <div className={pageStackContainer}>
      <h1 className={pageTitlePlain}>Create Payment Request</h1>
      <p className={pageSubtitlePlain}>Draft an invoice-style request and send it when you’re ready.</p>

      <div className={startPaymentCard}>
        <CreatePaymentRequestForm />
      </div>
    </div>
  );
}
