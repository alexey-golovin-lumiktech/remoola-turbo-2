import { CreatePaymentRequestForm } from '../../../../features/payment-requests/CreatePaymentRequestForm';

export default function CreatePaymentRequestPage() {
  return (
    <div className="space-y-6" data-testid="consumer-mobile-payment-request-new">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Request payment</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Create a payment request and send it to a client or contractor.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <CreatePaymentRequestForm />
      </div>
    </div>
  );
}
