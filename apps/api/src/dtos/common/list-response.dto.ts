import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class ListResponse<TDtoClassOrType> {
  @Expose()
  @ApiProperty({ description: `Total number of items in the result set` })
  @IsNumber()
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of items in the result set` })
  data: TDtoClassOrType[];
}
