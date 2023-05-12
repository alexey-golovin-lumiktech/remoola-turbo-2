import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNumber } from 'class-validator'

export interface IListResponse<TModel> {
  count: number
  data: TModel[]
}

export class ListResponse<TModelClass> implements IListResponse<TModelClass> {
  @Expose()
  @ApiProperty()
  @IsNumber()
  count: number

  @Expose()
  @ApiProperty()
  data: TModelClass[]
}
