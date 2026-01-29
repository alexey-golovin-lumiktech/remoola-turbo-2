import { LedgerAnomaliesPageClient } from './LedgerAnomaliesPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function LedgerAnomaliesPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <LedgerAnomaliesPageClient />
    </ClientBoundary>
  );
}
