import { type Metadata } from 'next';

import { StartPaymentForm } from '../../../../components';
import {
  pageStackContainer,
  pageSubtitlePlain,
  pageTitlePlain,
  startPaymentCard,
} from '../../../../components/ui/classNames';

export const metadata: Metadata = {
  title: `Start Payment – Remoola`,
};

export default function StartPaymentPage() {
  return (
    <div className={pageStackContainer}>
      <h1 className={pageTitlePlain}>Start Payment</h1>
      <p className={pageSubtitlePlain}>Send a quick one-off payment to a contractor or client.</p>

      <div className={startPaymentCard}>
        <StartPaymentForm />
      </div>
    </div>
  );
}
