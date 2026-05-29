import {
  adminV2LedgerDisputesQuerySchema,
  adminV2LedgerEntriesListQuerySchema,
  type AdminV2LedgerDisputesQuery,
  type AdminV2LedgerEntriesListQuery,
} from '@remoola/api-types';

import { buildPathWithSearch } from '../../../lib/navigation-context';
import { dateSearchParam, type SearchParamValue, trimmedSearchParam } from '../../../lib/query-contract';

export type LedgerView = `entries` | `disputes`;

export type LedgerPageParams = {
  view: LedgerView;
  cursor: string | undefined;
  q: string | undefined;
  type: string | undefined;
  status: string | undefined;
  currencyCode: string | undefined;
  paymentRequestId: string | undefined;
  consumerId: string | undefined;
  amountSign: string | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  entriesQuery: AdminV2LedgerEntriesListQuery;
  disputesQuery: AdminV2LedgerDisputesQuery;
  buildHref: (next: { cursor?: string; view?: string }) => string;
};

export function parseLedgerSearchParams(params: Record<string, SearchParamValue> | undefined): LedgerPageParams {
  const view: LedgerView = trimmedSearchParam(params?.view) === `disputes` ? `disputes` : `entries`;
  const cursor = trimmedSearchParam(params?.cursor);
  const q = trimmedSearchParam(params?.q);
  const type = trimmedSearchParam(params?.type);
  const status = trimmedSearchParam(params?.status);
  const currencyCode = trimmedSearchParam(params?.currencyCode);
  const paymentRequestId = trimmedSearchParam(params?.paymentRequestId);
  const consumerId = trimmedSearchParam(params?.consumerId);
  const amountSign = trimmedSearchParam(params?.amountSign);
  const dateFrom = dateSearchParam(params?.dateFrom);
  const dateTo = dateSearchParam(params?.dateTo);
  const entriesQuery = adminV2LedgerEntriesListQuerySchema.parse({
    cursor,
    q,
    type,
    status,
    currencyCode,
    paymentRequestId,
    consumerId,
    amountSign,
    dateFrom,
    dateTo,
  });
  const disputesQuery = adminV2LedgerDisputesQuerySchema.parse({
    cursor,
    q,
    paymentRequestId,
    consumerId,
    dateFrom,
    dateTo,
  });

  function buildHref(next: { cursor?: string; view?: string }) {
    const targetView = next.view ?? view;
    return buildPathWithSearch(`/ledger`, {
      view: targetView === `disputes` ? `disputes` : undefined,
      q,
      type: targetView === `entries` ? type : undefined,
      status: targetView === `entries` ? status : undefined,
      currencyCode: targetView === `entries` ? currencyCode : undefined,
      amountSign: targetView === `entries` ? amountSign : undefined,
      paymentRequestId,
      consumerId,
      dateFrom,
      dateTo,
      cursor: next.cursor,
    });
  }

  return {
    view,
    cursor,
    q,
    type,
    status,
    currencyCode,
    paymentRequestId,
    consumerId,
    amountSign,
    dateFrom,
    dateTo,
    entriesQuery,
    disputesQuery,
    buildHref,
  };
}
