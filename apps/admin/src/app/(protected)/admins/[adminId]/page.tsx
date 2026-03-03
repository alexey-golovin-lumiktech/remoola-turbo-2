import { AdminDetailsPageClient } from './AdminDetailsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';
import { type PageProps } from '../../../../lib/types';

export default async function AdminDetailsPage(props: PageProps<{ adminId: string }>) {
  const params = await props.params;
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <AdminDetailsPageClient adminId={params.adminId} />
    </ClientBoundary>
  );
}
