import { Type } from '@nestjs/common'
import { applyDecorators } from '@nestjs/common/decorators/core'
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger'

import { ListResponse } from '../dtos'

export const ApiCountRowsResponse = <TModelClass extends Type<any>>(model: TModelClass) => {
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
