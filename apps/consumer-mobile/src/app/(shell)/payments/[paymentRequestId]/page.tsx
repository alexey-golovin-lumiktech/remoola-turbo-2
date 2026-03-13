import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import styles from './page.module.css';
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
      <div className={styles.errorRoot}>
        <div className={styles.errorInner}>
          <h2 className={styles.errorTitle}>Invalid payment ID</h2>
          <p className={styles.errorText}>The payment ID provided is not valid.</p>
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
    <div className={styles.root}>
      <BackButton href="/payments" label="Back to Payments" />
      <PaymentDetailView paymentRequestId={paymentRequestId} data={data} />
    </div>
  );
}
