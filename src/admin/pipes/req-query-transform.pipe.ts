import { Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class ReqQueryTransformPipe implements PipeTransform {
  transform(query: { filter: string; sort: string; range?: string; comparisonFilters: string }) {
    const [field, direction] = JSON.parse(query.sort ?? `[]`)
    const [offset, limit] = JSON.parse(query.range ?? `[]`)
    const parsedQuery = {
      sorting: [{ field, direction }],
      paging: { limit, offset },
      filter: JSON.parse(query.filter ?? `{}`),
      comparisonFilters: JSON.parse(query.comparisonFilters ?? `[]`),
    }
    return parsedQuery
  }
}
