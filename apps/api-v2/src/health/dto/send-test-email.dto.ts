import { Expose } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class SendTestEmail {
  @Expose()
  @IsOptional()
  @IsEmail()
  to?: string;
}
