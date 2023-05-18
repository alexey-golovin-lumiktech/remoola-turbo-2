import { applyDecorators } from '@nestjs/common/decorators/core'
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger'
import { ClassConstructor } from 'class-transformer'

import { ListResponse } from '../dtos/common'

export const ApiCountRowsResponse = <TModelClass extends ClassConstructor<unknown>>(model: TModelClass) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ListResponse<TModelClass>) },
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
