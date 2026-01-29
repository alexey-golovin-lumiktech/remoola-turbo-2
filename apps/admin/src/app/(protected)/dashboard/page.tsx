import { DashboardPageClient } from './DashboardPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../components';

export default async function ConsumersPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <DashboardPageClient />
    </ClientBoundary>
  );
}
