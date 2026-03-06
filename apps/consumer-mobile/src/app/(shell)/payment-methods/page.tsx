import { cookies } from 'next/headers';

import { PaymentMethodsView } from '../../../features/payment-methods/PaymentMethodsView';
import { getPaymentMethods } from '../../../features/payment-methods/queries';

export default async function PaymentMethodsPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const items = await getPaymentMethods(cookie);
  return (
    <div
      className={`
        mx-auto
        w-full
        max-w-7xl
        space-y-4
        p-4
        sm:p-6
        lg:p-8
      `}
    >
      <PaymentMethodsView items={items} />
    </div>
  );
}
