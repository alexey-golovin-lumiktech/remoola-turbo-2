import { buildPathWithSearch } from '../navigation-context';

type QueryParamValue = string | number | boolean | null | undefined;

export function buildListPageHref(
  basePath: string,
  currentQuery: Record<string, QueryParamValue>,
  key: string,
  value: QueryParamValue,
): string {
  return buildPathWithSearch(basePath, { ...currentQuery, [key]: value });
}

export function countActiveFilters(parsed: Record<string, unknown>, ignoreKeys: readonly string[]): number {
  const ignored = new Set(ignoreKeys);
  let count = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (ignored.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === `string` && value.trim() === ``) continue;
    if (typeof value === `boolean` && value === false) continue;
    count++;
  }
  return count;
}
