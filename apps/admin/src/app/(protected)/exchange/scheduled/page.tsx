import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';
import { ScheduledConversionsPageClient } from './ScheduledConversionsPageClient';

export default async function ScheduledConversionsPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ScheduledConversionsPageClient />
    </ClientBoundary>
  );
}
