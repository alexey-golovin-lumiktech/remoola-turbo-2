import { type Metadata } from 'next';

import { PaymentView } from '../../../../components';

export const metadata: Metadata = {
  title: `Payment Details - Remoola`,
};

export default async function PaymentPage({ params }: { params: Promise<{ paymentRequestId: string }> }) {
  return <PaymentView paymentRequestId={(await params).paymentRequestId} />;
}
