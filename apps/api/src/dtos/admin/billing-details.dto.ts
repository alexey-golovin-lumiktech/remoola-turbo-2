import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsPhoneNumber, ValidateIf } from 'class-validator';

import {
  type IBillingDetailsModel,
  type IBillingDetailsResponse,
  type IBillingDetailsCreate,
  type IBillingDetailsUpdate,
  IsValidEmail,
} from '../../shared-common';
import { BaseModel } from '../common';

class BillingDetails extends BaseModel implements IBillingDetailsModel {
  @Expose()
  @ApiProperty({ description: `Billing email address for invoices and payment notifications`, required: false })
  @IsValidEmail()
  @ValidateIf(({ value }) => value != null)
  email?: string;

  @Expose()
  @ApiProperty({ description: `Billing name (individual or company name)`, required: false })
  @ValidateIf(({ value }) => value != null)
  name?: string;

  @Expose()
  @ApiProperty({ description: `Billing phone number in E.164 format`, required: false })
  @IsPhoneNumber()
  @ValidateIf(({ value }) => value != null)
  phone?: string;
}

export class BillingDetailsResponse
  extends OmitType(BillingDetails, [`deletedAt`] as const)
  implements IBillingDetailsResponse {}

export class BillingDetailsListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of billing details in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of billing detail records`, required: true, type: [BillingDetailsResponse] })
  @Type(() => BillingDetailsResponse)
  data: BillingDetailsResponse[];
}

export class BillingDetailsCreate
  extends PickType(BillingDetails, [
    `name`, //
    `email`,
    `phone`,
  ] as const)
  implements IBillingDetailsCreate {}

export class BillingDetailsUpdate extends PartialType(BillingDetailsCreate) implements IBillingDetailsUpdate {}
