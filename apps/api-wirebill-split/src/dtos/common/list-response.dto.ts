import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNumber } from 'class-validator'

export class ListResponse<TDtoClassOrType> {
  @Expose()
  @ApiProperty()
  @IsNumber()
  count: number

  @Expose()
  @ApiProperty()
  data: TDtoClassOrType[]
}
