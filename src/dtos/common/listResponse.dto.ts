import { ApiProperty } from '@nestjs/swagger'
import { IsNumber } from 'class-validator'

export interface IListResponse<TModel> {
  count: number
  data: TModel[]
}

export class ListResponse<TModelClass> implements IListResponse<TModelClass> {
  @ApiProperty()
  @IsNumber()
  count: number

  @ApiProperty()
  data: TModelClass[]
}
