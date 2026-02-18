import { ExpectationDateArchivePageClient } from './ExpectationDateArchivePageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function ExpectationDateArchivePage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ExpectationDateArchivePageClient />
    </ClientBoundary>
  );
}
