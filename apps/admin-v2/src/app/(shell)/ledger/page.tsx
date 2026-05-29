import { loadLedgerPage } from './page.loader';
import { parseLedgerSearchParams } from './page.params';
import { LedgerPageView } from './page.view';
import { type SearchParamValue } from '../../../lib/query-contract';

export default async function LedgerPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const params = parseLedgerSearchParams(await searchParams);
  const data = await loadLedgerPage(params);
  return <LedgerPageView data={data} />;
}
