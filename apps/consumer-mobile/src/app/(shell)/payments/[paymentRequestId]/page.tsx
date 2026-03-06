import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { getPaymentDetail } from '../../../../features/payments/queries';
import { paymentParamsSchema } from '../../../../features/payments/schemas';
import { PaymentDetailView } from '../../../../features/payments/ui/PaymentDetailView';
import { BackButton } from '../../../../shared/ui/BackButton';

interface PaymentDetailPageProps {
  params: Promise<{ paymentRequestId: string }>;
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const parsed = paymentParamsSchema.safeParse(await params);

  if (!parsed.success) {
    return (
      <div
        className={`
        flex
        min-h-[400px]
        items-center
        justify-center
      `}
      >
        <div className={`text-center`}>
          <h2
            className={`
            text-lg
            font-semibold
            text-slate-900
            dark:text-white
          `}
          >
            Invalid payment ID
          </h2>
          <p
            className={`
            mt-2
            text-sm
            text-slate-600
            dark:text-slate-400
          `}
          >
            The payment ID provided is not valid.
          </p>
        </div>
      </div>
    );
  }

  const { paymentRequestId } = parsed.data;
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const data = await getPaymentDetail(paymentRequestId, cookie);

  if (!data) {
    notFound();
  }

  return (
    <div className={`space-y-4`}>
      <BackButton href="/payments" label="Back to Payments" />
      <PaymentDetailView paymentRequestId={paymentRequestId} data={data} />
    </div>
  );
}
