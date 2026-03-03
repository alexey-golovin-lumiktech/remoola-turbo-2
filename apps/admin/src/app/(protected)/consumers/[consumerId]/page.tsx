import { ConsumerDetailsPageClient } from './ConsumerDetailsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';
import { type PageProps } from '../../../../lib/types';

export default async function ConsumerDetailsPage(props: PageProps<{ consumerId: string }>) {
  const params = await props.params;
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ConsumerDetailsPageClient consumerId={params.consumerId} />
    </ClientBoundary>
  );
}
