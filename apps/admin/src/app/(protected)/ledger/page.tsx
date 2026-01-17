import { LedgerPageClient } from './LedgerPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../components';

export default async function LedgerPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <LedgerPageClient />
    </ClientBoundary>
  );
}
