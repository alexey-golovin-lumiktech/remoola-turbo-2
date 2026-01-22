import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum Theme {
  LIGHT = `LIGHT`,
  DARK = `DARK`,
  SYSTEM = `SYSTEM`,
}

export class UpdateThemeDto {
  @ApiProperty({
    enum: Theme,
    description: `Theme preference`,
    example: Theme.LIGHT,
  })
  @IsEnum(Theme)
  theme: Theme;
}
