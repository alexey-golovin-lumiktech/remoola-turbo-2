import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * A unified decorator that:
 * - Validates it as a string
 * - Converts empty string / null / undefined → null
 */
export function OptionalNullableString() {
  return applyDecorators(
    IsOptional(),
    IsString(),
    Transform(({ value }) => {
      if ((typeof value === `string` && value.trim() === ``) || value === undefined) return null;
      return value;
    }),
  );
}
