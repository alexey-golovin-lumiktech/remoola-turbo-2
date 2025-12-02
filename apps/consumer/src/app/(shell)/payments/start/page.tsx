import { type Metadata } from 'next';

import { StartPaymentForm } from '../../../../components';

export const metadata: Metadata = {
  title: `Start Payment – Remoola`,
};

export default function StartPaymentPage() {
  return (
    <div className="px-8 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Start Payment</h1>
      <p className="text-sm text-slate-500">Send a quick one-off payment to a contractor or client.</p>

      <div className="rounded-2xl bg-white p-6 shadow-sm max-w-xl">
        <StartPaymentForm />
      </div>
    </div>
  );
}
