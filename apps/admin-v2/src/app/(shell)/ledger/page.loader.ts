import { type LedgerPageParams } from './page.params';
import { getLedgerDisputes, getLedgerEntries } from '../../../lib/admin-api/ledger.server';
import { type LedgerDisputesResponse, type LedgerEntriesListResponse } from '../../../lib/admin-api/types';

export type LedgerPageData = {
  params: LedgerPageParams;
  entries: LedgerEntriesListResponse | null;
  disputes: LedgerDisputesResponse | null;
};

export async function loadLedgerPage(params: LedgerPageParams): Promise<LedgerPageData> {
  const [entries, disputes] = await Promise.all([
    params.view === `entries` ? getLedgerEntries(params.entriesQuery) : Promise.resolve(null),
    params.view === `disputes` ? getLedgerDisputes(params.disputesQuery) : Promise.resolve(null),
  ]);

  return { params, entries, disputes };
}
