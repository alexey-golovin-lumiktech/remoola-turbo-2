import { Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class ReqQueryTransformPipe implements PipeTransform {
  transform(query: { filter: string; sorting?: string; paging?: string; comparisonFilters: string }) {
    const parsedComparisonFilters = JSON.parse(query.comparisonFilters ?? `[]`)
    const parsedQuery = {
      filter: JSON.parse(query.filter ?? `{}`),
      sorting: JSON.parse(query.sorting ?? `[]`),
      paging: JSON.parse(query.paging ?? `{}`),
      comparisonFilters: parsedComparisonFilters,
    }
    return parsedQuery
  }
}
