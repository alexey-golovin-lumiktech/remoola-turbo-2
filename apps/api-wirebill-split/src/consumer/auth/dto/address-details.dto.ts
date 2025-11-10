import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { type AddressDetails as IAddressDetails } from '@remoola/database';

class AddressDetails implements IAddressDetails {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  postalCode: string;

  @Expose()
  @ApiProperty()
  country: string;

  @Expose()
  @ApiProperty()
  city: string;

  @Expose()
  @ApiProperty()
  state: string;

  @Expose()
  @ApiProperty()
  street: string;

  @Expose()
  @ApiProperty()
  consumerId: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @ApiProperty()
  deletedAt: Date;
}

export class AddressDetailsUpsert extends PickType(AddressDetails, [
  `postalCode`,
  `country`,
  `city`,
  `state`,
  `street`,
] as const) {}

export class AddressDetailsUpsertOkResponse {
  @Expose()
  @ApiProperty()
  addressDetailsId: string;
}
