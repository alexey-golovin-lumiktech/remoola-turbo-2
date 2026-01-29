import { AdminsPageClient } from './AdminsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../components';

export default async function AdminsPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <AdminsPageClient />
    </ClientBoundary>
  );
}
