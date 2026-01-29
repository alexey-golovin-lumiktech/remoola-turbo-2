import { PaymentRequestDetailsClient } from './PaymentRequestDetailsClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function PaymentRequestDetailsPage(props: PageProps<`/payment-requests/[paymentRequestId]`>) {
  const params = await props.params;
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <PaymentRequestDetailsClient paymentRequestId={params.paymentRequestId} />
    </ClientBoundary>
  );
}
