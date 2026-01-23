import { type Metadata } from 'next';

import { PaymentsList } from '../../../components';

export const metadata: Metadata = {
  title: `Payments - Remoola`,
};

export default function PaymentsPage() {
  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Payments</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        View your incoming and outgoing payments.
      </p>

      <PaymentsList />
    </div>
  );
}
