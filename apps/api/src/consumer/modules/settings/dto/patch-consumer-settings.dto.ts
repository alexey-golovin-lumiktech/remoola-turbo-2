import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

import { ALLOWED_PREFERRED_CURRENCIES } from '@remoola/api-types';

import { Theme } from './update-theme.dto';

export class PatchConsumerSettingsDto {
  @Expose()
  @ApiPropertyOptional({
    enum: [`LIGHT`, `DARK`, `SYSTEM`],
    description: `Theme preference`,
  })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @Expose()
  @ApiPropertyOptional({
    enum: ALLOWED_PREFERRED_CURRENCIES,
    description: `Preferred display currency (UI default only; fintech-safe allowlist)`,
  })
  @IsOptional()
  @IsIn(ALLOWED_PREFERRED_CURRENCIES)
  preferredCurrency?: (typeof ALLOWED_PREFERRED_CURRENCIES)[number];
}
