import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsEmail, IsNotEmpty } from 'class-validator'

import { IContactCreate, IContactResponse, IContactUpdate } from '@wirebill/shared-common/dtos'
import { IContactModel } from '@wirebill/shared-common/models'

import { AddressDetailsCreate } from '../admin'
import { BaseModel } from '../common'

class ContactAddress extends OmitType(AddressDetailsCreate, [`consumerId`] as const) {}

class Contact extends BaseModel implements IContactModel {
  @Expose()
  @ApiProperty({ required: true })
  consumerId: string

  @Expose()
  @ApiProperty({ required: true })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: true, type: ContactAddress })
  address: ContactAddress
}

export class ContactResponse extends OmitType(Contact, [`deletedAt`] as const) implements IContactResponse {}

export class ContactListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [ContactResponse] })
  @Type(() => ContactResponse)
  data: ContactResponse[]
}

export class ContactCreate extends PickType(Contact, [`consumerId`, `address`, `email`, `name`] as const) implements IContactCreate {}

export class ContactUpdate extends PartialType(ContactCreate) implements IContactUpdate {}
