import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNumber } from 'class-validator'

export interface IListResponse<TDtoInterface> {
  count: number
  data: TDtoInterface[]
}

export class ListResponse<TDtoClass> implements IListResponse<TDtoClass> {
  @Expose()
  @ApiProperty()
  @IsNumber()
  count: number

  @Expose()
  @ApiProperty()
  data: TDtoClass[]
}
