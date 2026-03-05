import { cookies } from 'next/headers';

import { getBalance } from '../../../features/payments/queries';
import { WithdrawTransferView } from '../../../features/payments/ui/WithdrawTransferView';

export const dynamic = `force-dynamic`;

export default async function WithdrawTransferPage() {
  const cookieStore = await cookies();
  const cookieString = cookieStore.toString();

  const balance = await getBalance(cookieString);

  return <WithdrawTransferView balance={balance} />;
}
