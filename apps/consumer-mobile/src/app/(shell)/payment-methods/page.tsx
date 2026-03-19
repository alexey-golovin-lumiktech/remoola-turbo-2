import { cookies } from 'next/headers';

import styles from './page.module.css';
import { PaymentMethodsView } from '../../../features/payment-methods/PaymentMethodsView';
import { getPaymentMethods } from '../../../features/payment-methods/queries';

export default async function PaymentMethodsPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const result = await getPaymentMethods(cookie);
  const items = result.ok ? result.items : [];
  return (
    <div className={styles.root}>
      <PaymentMethodsView items={items} />
    </div>
  );
}
