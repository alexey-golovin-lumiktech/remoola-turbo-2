import { ScheduledConversionsPageClient } from './ScheduledConversionsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function ScheduledConversionsPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ScheduledConversionsPageClient />
    </ClientBoundary>
  );
}
