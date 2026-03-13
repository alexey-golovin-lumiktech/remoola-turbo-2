import styles from './page.module.css';
import { CreatePaymentRequestForm } from '../../../../features/payment-requests/CreatePaymentRequestForm';

export default function CreatePaymentRequestPage() {
  return (
    <div className={styles.root} data-testid="consumer-mobile-payment-request-new">
      <div>
        <h1 className={styles.title}>Request payment</h1>
        <p className={styles.subtitle}>Create a payment request and send it to a client or contractor.</p>
      </div>

      <div className={styles.card}>
        <CreatePaymentRequestForm />
      </div>
    </div>
  );
}
