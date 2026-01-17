import { PaymentRequestsPageClient } from './PaymentRequestsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../components';

export default async function PaymentRequestsPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <PaymentRequestsPageClient />
    </ClientBoundary>
  );
}
