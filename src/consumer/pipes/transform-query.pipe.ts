import { Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class ConsumerQueryTransformPipe implements PipeTransform {
  transform(value: { filter?: string; sorting?: string; paging?: string }) {
    return Object.keys(value).reduce(
      (acc, key) => {
        if (key == `paging`) {
          const { offset = 0, limit = 1000 } = JSON.parse(value[key])
          acc = { ...acc, paging: { offset, limit } }
        }

        if (key == `filter`) {
          const filter = JSON.parse(value[key])
          if (Object.keys(filter).length != 0) acc = { ...acc, filter }
        }

        if (key == `sorting`) {
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
