import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';

export enum Theme {
  LIGHT = `LIGHT`,
  DARK = `DARK`,
  SYSTEM = `SYSTEM`,
}

export class UpdateThemeDto {
  @Expose()
  @ApiProperty({
    enum: Theme,
    description: `Theme preference`,
    example: Theme.LIGHT,
  })
  @IsEnum(Theme)
  theme: Theme;
}
