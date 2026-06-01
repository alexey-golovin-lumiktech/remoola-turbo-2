import { loadLedgerAnomaliesPage } from './page.loader';
import { parseLedgerAnomaliesSearchParams } from './page.params';
import { loadLedgerAnomaliesPermissions } from './page.permissions';
import { LedgerAnomaliesPageView } from './page.view';
import { type SearchParamValue } from '../../../../lib/query-contract';

export default async function LedgerAnomaliesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const params = parseLedgerAnomaliesSearchParams(await searchParams);
  const permissions = await loadLedgerAnomaliesPermissions();
  const data = await loadLedgerAnomaliesPage(params, permissions);
  return <LedgerAnomaliesPageView data={data} />;
}
