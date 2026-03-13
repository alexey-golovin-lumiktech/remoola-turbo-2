import styles from './page.module.css';
import { StartPaymentForm } from '../../../../features/payments/ui/StartPaymentForm';

export default function StartPaymentPage() {
  return (
    <div className={styles.wrapper} data-testid="consumer-mobile-payments-start">
      <div className={styles.header}>
        <h1 className={styles.title}>Send payment</h1>
        <p className={styles.subtitle}>Send a quick one-time payment to a contractor or client.</p>
      </div>

      <div className={styles.card}>
        <StartPaymentForm />
      </div>
    </div>
  );
}
