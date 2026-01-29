import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { type IAddressDetailsCreate, type IAddressDetailsModel, type IAddressDetailsUpdate } from '../../shared-common';
import { BaseModel } from '../common';

class AddressDetails extends BaseModel implements IAddressDetailsModel {
  @Expose()
  @ApiProperty({ required: true })
  postalCode: string;

  @Expose()
  @ApiProperty({ required: true })
  country: string;

  @Expose()
  @ApiProperty({ required: false })
  state?: string = null;

  @Expose()
  @ApiProperty({ required: false })
  city?: string = null;

  @Expose()
  @ApiProperty({ required: false })
  street?: string = null;
}

export class AddressDetailsResponse extends OmitType(AddressDetails, [`deletedAt`] as const) {}

export class AddressDetailsCreate
  extends PickType(AddressDetails, [`postalCode`, `country`, `state`, `city`, `street`] as const)
  implements IAddressDetailsCreate {}

export class AddressDetailsUpdate extends PartialType(AddressDetailsCreate) implements IAddressDetailsUpdate {}
