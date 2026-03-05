import { StartPaymentForm } from '../../../../features/payments';

export default function StartPaymentPage() {
  return (
    <div className="space-y-6" data-testid="consumer-mobile-payments-start">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Send payment</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Send a quick one-time payment to a contractor or client.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <StartPaymentForm />
      </div>
    </div>
  );
}
