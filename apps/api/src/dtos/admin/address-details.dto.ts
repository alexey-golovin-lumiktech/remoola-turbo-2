import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import {
  type IAddressDetailsResponse,
  type IAddressDetailsCreate,
  type IAddressDetailsUpdate,
  type IAddressDetailsModel,
} from '../../shared-common';
import { BaseModel } from '../common';

class AddressDetails extends BaseModel implements IAddressDetailsModel {
  @Expose()
  @ApiProperty({ description: `Postal or ZIP code for the address`, required: true })
  postalCode: string;

  @Expose()
  @ApiProperty({ description: `Country name or ISO country code`, required: true })
  country: string;

  @Expose()
  @ApiProperty({ description: `State, province, or region (optional for some countries)`, required: false })
  state?: string = null;

  @Expose()
  @ApiProperty({ description: `City or locality name`, required: false })
  city?: string = null;

  @Expose()
  @ApiProperty({ description: `Street address (street name, number, apartment)`, required: false })
  street?: string = null;
}

export class AddressDetailsResponse
  extends OmitType(AddressDetails, [`deletedAt`] as const)
  implements IAddressDetailsResponse {}

export class AddressDetailsListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of addresses in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of address records`, required: true, type: [AddressDetailsResponse] })
  @Type(() => AddressDetailsResponse)
  data: AddressDetailsResponse[];
}

export class AddressDetailsCreate
  extends PickType(AddressDetails, [
    `postalCode`, //
    `country`,
    `state`,
    `city`,
    `street`,
  ] as const)
  implements IAddressDetailsCreate {}

export class AddressDetailsUpdate extends PartialType(AddressDetailsCreate) implements IAddressDetailsUpdate {}
