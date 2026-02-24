import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { type IAddressDetailsCreate, type IAddressDetailsModel, type IAddressDetailsUpdate } from '../../shared-common';
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

export class AddressDetailsResponse extends OmitType(AddressDetails, [`deletedAt`] as const) {}

export class AddressDetailsCreate
  extends PickType(AddressDetails, [`postalCode`, `country`, `state`, `city`, `street`] as const)
  implements IAddressDetailsCreate {}

export class AddressDetailsUpdate extends PartialType(AddressDetailsCreate) implements IAddressDetailsUpdate {}
