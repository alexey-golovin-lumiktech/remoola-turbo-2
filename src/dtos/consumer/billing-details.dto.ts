import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'

import { IAddressModel, IBaseModel, IBillingDetailsModel } from 'src/models'

export type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

export type IAddressModelPick = Pick<IAddressModel, `id` | `city` | `country` | `line1` | `line2` | `postal_code` | `state`>
export type IBillingDetailsModelPick = Pick<IBillingDetailsModel, `id` | `email` | `name` | `phone`>
export type IBillingDetailsResponse = IBillingDetailsModelPick & { address: IAddressModelPick }

export class BillingDetailsAddress implements IAddressModelPick {
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

export class BillingDetailsResponse implements IBillingDetailsResponse {
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
