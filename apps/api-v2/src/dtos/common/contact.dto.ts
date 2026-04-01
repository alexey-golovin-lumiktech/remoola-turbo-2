import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { AddressDetailsCreate } from './address-details.dto';
import { BaseModel } from './base-model.dto';
import {
  type IContactCreate,
  type IContactModel,
  type IContactResponse,
  type IContactUpdate,
  IsValidEmail,
} from '../../shared-common';

class Contact extends BaseModel implements IContactModel {
  @Expose()
  @ApiProperty({ description: `ID of the consumer who owns this contact`, required: true })
  consumerId: string;

  @Expose()
  @ApiProperty({ description: `Contact email address`, required: true })
  @IsValidEmail()
  @IsNotEmpty()
  email: string;

  @Expose()
  @ApiProperty({ description: `Contact name (optional, can be company or person name)`, required: false })
  name?: string;

  @Expose()
  @ApiProperty({ description: `Contact address details`, required: true, type: AddressDetailsCreate })
  address: AddressDetailsCreate;
}

export class ContactResponse extends OmitType(Contact, [`deletedAt`] as const) implements IContactResponse {}

export class ContactListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of contacts in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of contact records`, required: true, type: [ContactResponse] })
  @Type(() => ContactResponse)
  data: ContactResponse[];
}

export class ContactCreate
  extends PickType(Contact, [`consumerId`, `address`, `email`, `name`] as const)
  implements IContactCreate {}

export class ContactUpdate extends PartialType(ContactCreate) implements IContactUpdate {}
