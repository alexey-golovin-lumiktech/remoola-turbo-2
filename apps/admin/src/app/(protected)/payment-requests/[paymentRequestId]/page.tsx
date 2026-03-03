import { PaymentRequestDetailsClient } from './PaymentRequestDetailsClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';
import { type PageProps } from '../../../../lib/types';

export default async function PaymentRequestDetailsPage(props: PageProps<{ paymentRequestId: string }>) {
  const params = await props.params;
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <PaymentRequestDetailsClient paymentRequestId={params.paymentRequestId} />
    </ClientBoundary>
  );
}
