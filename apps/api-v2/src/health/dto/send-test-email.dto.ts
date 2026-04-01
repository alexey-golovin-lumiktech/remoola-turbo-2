import { Expose } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class SendTestEmailDto {
  @Expose()
  @IsOptional()
  @IsEmail()
  to?: string;
}
