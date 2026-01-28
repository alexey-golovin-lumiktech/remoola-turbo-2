import { ClientBoundary, WaitForLoadingFallback } from '../../../../components';
import { ExchangeRulesPageClient } from './ExchangeRulesPageClient';

export default async function ExchangeRulesPage() {
  return (
    <ClientBoundary fallback={<WaitForLoadingFallback />}>
      <ExchangeRulesPageClient />
    </ClientBoundary>
  );
}
