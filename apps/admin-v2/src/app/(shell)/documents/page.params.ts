import { adminV2DocumentsListQuerySchema } from '@remoola/api-types';

import {
  booleanSearchParam,
  dateSearchParam,
  finiteNumberSearchParam,
  positiveIntegerSearchParam,
  trimmedSearchParam,
} from '../../../lib/query-contract';

export type DocumentsPageRawParams = Record<string, string | string[] | undefined>;

type DocumentsPageQuery = ReturnType<typeof adminV2DocumentsListQuerySchema.parse>;

export type DocumentsPageParams = {
  raw: DocumentsPageRawParams;
  query: DocumentsPageQuery;
  page: number;
  includeDeleted: boolean;
  activeFilterCount: number;
};

export function parseDocumentsSearchParams(raw: DocumentsPageRawParams): DocumentsPageParams {
  const query = adminV2DocumentsListQuerySchema.parse({
    page: positiveIntegerSearchParam(raw.page, 1),
    q: trimmedSearchParam(raw.q),
    consumerId: trimmedSearchParam(raw.consumerId),
    access: trimmedSearchParam(raw.access),
    mimetype: trimmedSearchParam(raw.mimetype),
    sizeMin: finiteNumberSearchParam(raw.sizeMin),
    sizeMax: finiteNumberSearchParam(raw.sizeMax),
    createdFrom: dateSearchParam(raw.createdFrom),
    createdTo: dateSearchParam(raw.createdTo),
    paymentRequestId: trimmedSearchParam(raw.paymentRequestId),
    tag: trimmedSearchParam(raw.tag),
    tagId: trimmedSearchParam(raw.tagId),
    includeDeleted: booleanSearchParam(raw.includeDeleted),
  });
  const page = query.page ?? 1;
  const includeDeleted = query.includeDeleted === true;
  const activeFilterCount = [
    query.q ?? ``,
    query.consumerId ?? ``,
    query.paymentRequestId ?? ``,
    query.tag ?? ``,
    query.access ?? ``,
    query.mimetype ?? ``,
    query.sizeMin === undefined ? `` : String(query.sizeMin),
    query.sizeMax === undefined ? `` : String(query.sizeMax),
    query.createdFrom ?? ``,
    query.createdTo ?? ``,
    includeDeleted ? `include deleted` : ``,
  ].filter(Boolean).length;

  return { raw, query, page, includeDeleted, activeFilterCount };
}
