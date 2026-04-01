import { BankingClient } from './BankingClient';
import { getPaymentMethods } from '../../../lib/consumer-api.server';
import { BankIcon } from '../../../shared/ui/icons/BankIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

export default async function BankingPage() {
  const paymentMethodsResponse = await getPaymentMethods({ redirectTo: `/banking` });
  const accounts = paymentMethodsResponse?.items ?? [];

  return (
    <div>
      <PageHeader title="Bank & Cards" icon={<BankIcon className="h-10 w-10 text-white" />} />
      <BankingClient accounts={accounts} />
    </div>
  );
}
