import PaymentMethodsPageClient from '../../../components/payment-methods/PaymentMethodsPageClient';
import { getPaymentMethods } from '../../../lib/paymentMethods';

export default async function PaymentMethodsPage() {
  const { items } = await getPaymentMethods();

  return <PaymentMethodsPageClient initialItems={items} />;
}
