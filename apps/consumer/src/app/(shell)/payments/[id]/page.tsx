import { PaymentView } from '../../../../components';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  return <PaymentView paymentRequestId={(await params).id} />;
}
