import { ConsumerDetailsPageClient } from './ConsumerDetailsPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function ConsumerDetailsPage(props: PageProps<`/consumers/[consumerId]`>) {
  const params = await props.params;
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ConsumerDetailsPageClient consumerId={params.consumerId} />
    </ClientBoundary>
  );
}
