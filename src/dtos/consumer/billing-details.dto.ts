import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'

import { IAddressModel, IBaseModel, IBillingDetailsModel } from 'src/models'

export type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }
export type IBillingDetailsResponse = IBillingDetailsModel & { address: IAddressModel }

export class BillingDetailsAddress implements IAddressModel {
  @Exclude()
  createdAt: Date
  @Exclude()
  updatedAt: Date
  @Exclude()
  deletedAt: Date
  @Exclude()
  billingDetailsId: string
  @Exclude()
  consumerId: string

  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty({ default: null })
  city: string = null

  @Expose()
  @ApiProperty({ default: null })
  country: string = null

  @Expose()
  @ApiProperty({ default: null })
  line1: string = null

  @Expose()
  @ApiProperty({ default: null })
  line2: string = null

  @Expose()
  @ApiProperty({ default: null })
  postal_code: string = null

  @Expose()
  @ApiProperty({ default: null })
  state: string = null
}

export class BillingDetailsResponse implements IBillingDetailsModel {
  @Exclude()
  createdAt: Date
  @Exclude()
  updatedAt: Date
  @Exclude()
  deletedAt: Date
  @Exclude()
  consumerId: string
  @Exclude()
  addressId: string

  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty({ default: null })
  email: string = null

  @Expose()
  @ApiProperty({ default: null })
  name: string

  @Expose()
  @ApiProperty({ default: null })
  phone: string = null

  @Expose()
  @ApiProperty({ default: null, type: BillingDetailsAddress })
  address: BillingDetailsAddress = null
}
