import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class TransferBody {
  @Expose()
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @Expose()
  @ApiProperty()
  @IsString()
  recipient!: string; // email

  @Expose()
  @ApiPropertyOptional()
  @IsString()
  note?: string | null;
}
