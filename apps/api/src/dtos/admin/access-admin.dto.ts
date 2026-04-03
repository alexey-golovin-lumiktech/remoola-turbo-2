import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class Access {
  @Expose()
  @ApiProperty({ description: `Cookie-backed admin session was established successfully`, example: true })
  @IsNotEmpty()
  ok: true;
}
