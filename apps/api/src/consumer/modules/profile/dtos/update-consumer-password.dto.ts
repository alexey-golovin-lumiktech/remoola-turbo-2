import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class UpdateConsumerPasswordBody {
  @Expose()
  @ApiProperty({ required: true, isArray: false })
  @IsString()
  @MinLength(8)
  password!: string;
}
