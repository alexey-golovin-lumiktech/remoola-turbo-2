import { Expose, Transform, Type } from 'class-transformer';
import { Equals, IsBoolean, IsInt, IsString, MaxLength, Min } from 'class-validator';

import {
  type AdminV2ConfirmedMutationBody,
  type AdminV2ConfirmedVersionedMutationBody,
  type AdminV2ExpectedDeletedAtNullBody,
  type AdminV2StepUpConfirmedVersionedMutationBody,
  type AdminV2StepUpVersionedMutationBody,
  type AdminV2VersionedMutationBody,
} from '@remoola/api-types';

export class VersionedMutationBody implements AdminV2VersionedMutationBody {
  @Expose()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class StepUpVersionedMutationBody extends VersionedMutationBody implements AdminV2StepUpVersionedMutationBody {
  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

export class ConfirmedMutationBody implements AdminV2ConfirmedMutationBody {
  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  confirmed!: boolean;
}

export class ConfirmedVersionedMutationBody
  extends VersionedMutationBody
  implements AdminV2ConfirmedVersionedMutationBody
{
  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  confirmed!: boolean;
}

export class StepUpConfirmedVersionedMutationBody
  extends StepUpVersionedMutationBody
  implements AdminV2StepUpConfirmedVersionedMutationBody
{
  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  confirmed!: boolean;
}

export class ExpectedDeletedAtNullBody implements AdminV2ExpectedDeletedAtNullBody {
  @Expose()
  @Type(() => Number)
  @Equals(0)
  expectedDeletedAtNull!: number;
}
