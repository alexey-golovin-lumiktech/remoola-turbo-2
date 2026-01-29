import { ConsumersPageClient } from './ConsumersPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../components';

export default async function ConsumersPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ConsumersPageClient />
    </ClientBoundary>
  );
}
