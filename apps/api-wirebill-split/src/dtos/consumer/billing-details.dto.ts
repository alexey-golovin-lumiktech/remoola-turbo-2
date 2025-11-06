import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsPhoneNumber, ValidateIf } from 'class-validator';

import {
  type IBillingDetailsCreate,
  type IBillingDetailsModel,
  type IBillingDetailsResponse,
  type IBillingDetailsUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

class BillingDetails extends BaseModel implements IBillingDetailsModel {
  @Expose()
  @ApiProperty({ required: false })
  @IsEmail()
  @ValidateIf(({ value }) => value != null)
  email?: string;

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf(({ value }) => value != null)
  name?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsPhoneNumber()
  @ValidateIf(({ value }) => value != null)
  phone?: string;
}

export class BillingDetailsResponse
  extends OmitType(BillingDetails, [`deletedAt`] as const)
  implements IBillingDetailsResponse {}

export class BillingDetailsCreate
  extends PickType(BillingDetails, [`name`, `email`, `phone`] as const)
  implements IBillingDetailsCreate {}

export class BillingDetailsUpdate extends PartialType(BillingDetailsCreate) implements IBillingDetailsUpdate {}
