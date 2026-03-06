import { headers } from 'next/headers';

import { getBalance, getPayments } from '../../../features/payments/queries';
import { PaymentsListView } from '../../../features/payments/ui/PaymentsListView';

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const page = typeof params.page === `string` ? parseInt(params.page, 10) : 1;
  const pageSize = 20;

  const headersList = await headers();
  const cookie = headersList.get(`cookie`);

  const [balance, paymentsResponse] = await Promise.all([getBalance(cookie), getPayments({ cookie, page, pageSize })]);

  return (
    <PaymentsListView
      balance={balance}
      payments={paymentsResponse.items}
      total={paymentsResponse.total}
      currentPage={page}
      pageSize={pageSize}
    />
  );
}
