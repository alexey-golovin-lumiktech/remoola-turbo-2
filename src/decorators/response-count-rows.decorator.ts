import { Type } from '@nestjs/common'
import { applyDecorators } from '@nestjs/common/decorators/core'
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger'
import { CountRows } from 'src/dtos'

export const ApiCountRowsResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(CountRows) },
          {
            properties: {
              count: { type: `number` },
              rows: {
                type: `array`,
                items: { $ref: getSchemaPath(model) }
              }
            }
          }
        ]
      }
    })
  )
}
