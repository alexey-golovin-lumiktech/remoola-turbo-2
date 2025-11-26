import PaymentView from '../../../../components/payments/PaymentView';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PaymentView paymentRequestId={id} />;
}
