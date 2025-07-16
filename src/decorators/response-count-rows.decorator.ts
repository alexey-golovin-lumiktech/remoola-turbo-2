import { applyDecorators } from '@nestjs/common'
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger'
import { ClassConstructor } from 'class-transformer'

import { ListResponse } from '../dtos/common'

export const ApiCountRowsResponse = <TModel extends ClassConstructor<unknown>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ListResponse) },
          {
            properties: {
              count: { type: `number` },
              data: {
                type: `array`,
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  )
}
