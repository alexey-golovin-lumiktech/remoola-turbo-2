import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn } from 'class-validator';

import { THEMES, type TTheme } from '@remoola/api-types';

export class UpdateTheme {
  @Expose()
  @ApiProperty({
    enum: THEMES,
    description: `Theme preference`,
    example: `LIGHT`,
  })
  @IsIn(THEMES)
  theme: TTheme;
}
