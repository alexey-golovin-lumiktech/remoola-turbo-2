import { cookies } from 'next/headers';

import styles from './page.module.css';
import { CreatePaymentRequestForm } from '../../../../features/payment-requests/CreatePaymentRequestForm';
import { getSettings } from '../../../../features/settings/queries';

export default async function CreatePaymentRequestPage() {
  const cookieStore = await cookies();
  const settings = await getSettings(cookieStore.toString());
  const defaultCurrency =
    settings.kind === `ok` && settings.data.preferredCurrency ? settings.data.preferredCurrency : `USD`;

  return (
    <div className={styles.root} data-testid="consumer-mobile-payment-request-new">
      <div>
        <h1 className={styles.title}>Request payment</h1>
        <p className={styles.subtitle}>Create a payment request and send it to a client or contractor.</p>
      </div>

      <div className={styles.card}>
        <CreatePaymentRequestForm defaultCurrency={defaultCurrency} />
      </div>
    </div>
  );
}
