import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNumber } from 'class-validator'

export interface IListResponse<TDto> {
  count: number
  data: TDto[]
}

export class ListResponseDTO<TDto> implements IListResponse<TDto> {
  @Expose()
  @ApiProperty()
  @IsNumber()
  count: number

  @Expose()
  @ApiProperty()
  data: TDto[]
}
