import { Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class AdminPanelQueryTransformPipe implements PipeTransform {
  transform(value: { filter?: string; sort?: string; range?: string }) {
    return Object.keys(value).reduce(
      (acc, key) => {
        if (key == `range`) {
          const [offset, limit] = JSON.parse(value[key])
          if (limit) acc = { ...acc, paging: { limit } }
          if (offset) acc = { ...acc, paging: { ...acc.paging, offset } }
        }

        if (key == `filter`) {
          const filter = JSON.parse(value[key])
          if (Object.keys(filter).length != 0) acc = { ...acc, filter }
        }

        if (key == `sort`) {
          const sorting = JSON.parse(value[key])
          if (sorting.length != 0) {
            const [field, direction] = sorting
            acc = { ...acc, sorting: [{ field, direction }] }
          }
        }

        return acc
      },
      { filter: null, paging: null, sorting: null },
    )
  }
}
