import { AuditPageClient } from './AuditPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../components';

export default async function AuditPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <AuditPageClient />
    </ClientBoundary>
  );
}
