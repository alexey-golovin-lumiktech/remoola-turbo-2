import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

import { CURRENCY_CODES, type TCurrencyCode, THEMES, type TTheme } from '@remoola/api-types';

export class PatchConsumerSettings {
  @Expose()
  @ApiPropertyOptional({
    enum: THEMES,
    description: `Theme preference`,
  })
  @IsOptional()
  @IsIn(THEMES)
  theme?: TTheme;

  @Expose()
  @ApiPropertyOptional({
    enum: CURRENCY_CODES,
    description: `Preferred display currency (UI default only; fintech-safe allowlist)`,
  })
  @IsOptional()
  @IsIn(CURRENCY_CODES)
  preferredCurrency?: TCurrencyCode;
}
