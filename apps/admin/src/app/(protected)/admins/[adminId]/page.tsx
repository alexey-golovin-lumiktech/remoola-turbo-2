import { AdminDetailsPageClient } from './AdminDetailsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function AdminDetailsPage(props: PageProps<`/admins/[adminId]`>) {
  const params = await props.params;
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <AdminDetailsPageClient adminId={params.adminId} />
    </ClientBoundary>
  );
}
