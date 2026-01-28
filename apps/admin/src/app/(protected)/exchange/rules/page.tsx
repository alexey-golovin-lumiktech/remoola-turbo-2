import { ExchangeRulesPageClient } from './ExchangeRulesPageClient';
import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';

export default async function ExchangeRulesPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ExchangeRulesPageClient />
    </ClientBoundary>
  );
}
